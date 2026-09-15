import { inflateRawSync } from "zlib";
import * as CFB from "cfb";
import JSZip from "jszip";

// ── 한글 97 이후 바이너리(.hwp, HWP 5.0) ─────────────────────────────
// 파일 안은 OLE 복합 문서이고, 본문은 BodyText/Section{n} 스트림에 레코드로 들어 있다.

const HWP_SIGNATURE = "HWP Document File";
// FileHeader 속성 비트 — 압축 / 암호 / 배포용 문서.
const HEADER_PROPERTIES_OFFSET = 36;
const HEADER_COMPRESSED = 0x1;
const HEADER_ENCRYPTED = 0x2;
const HEADER_DISTRIBUTION = 0x4;

// 구역 하나를 풀었을 때 최대 크기 — 압축 폭탄 같은 파일이 서버 메모리를 다 쓰지 않게 막는다(넘으면 그 파일은 못 읽음 처리).
const MAX_SECTION_BYTES = 64 * 1024 * 1024;

// 문단 글자 레코드(HWPTAG_BEGIN 0x10 + 51).
export const HWPTAG_PARA_TEXT = 0x10 + 51;
// 레코드 크기 칸이 이 값이면 실제 크기는 다음 4바이트에 있다.
const RECORD_SIZE_EXTENDED = 0xfff;

// 0~31 제어 문자 중 한 칸짜리. 나머지(탭·표·그림 등)는 8칸을 차지하는 인라인·확장 제어다.
const SINGLE_WCHAR_CONTROLS = new Set([0, 10, 13, 24, 25, 26, 27, 28, 29, 30, 31]);
const INLINE_CONTROL_WCHARS = 8;
const LINE_BREAK = 10;
const PARAGRAPH_BREAK = 13;
const TAB = 9;
const HYPHEN = 24;
const NON_BREAKING_SPACES = new Set([30, 31]);

const toBuffer = (content: CFB.CFB$Blob): Buffer => Buffer.from(content as Uint8Array);

const findEntryContent = (container: CFB.CFB$Container, pattern: RegExp): Buffer | null => {
  const index = container.FullPaths.findIndex((fullPath) => pattern.test(fullPath));
  const content = index >= 0 ? container.FileIndex[index].content : null;
  return content ? toBuffer(content) : null;
};

// 문단 글자(UTF-16LE) → 문자열. 표·그림 같은 개체 자리는 건너뛴다(표 안 글자는 별도 문단 레코드로 나온다).
const decodeParaText = (data: Buffer): string => {
  let text = "";
  let offset = 0;
  while (offset + 1 < data.length) {
    const code = data.readUInt16LE(offset);
    if (code >= 32) {
      text += String.fromCharCode(code);
      offset += 2;
    } else if (SINGLE_WCHAR_CONTROLS.has(code)) {
      if (code === LINE_BREAK || code === PARAGRAPH_BREAK) text += "\n";
      else if (NON_BREAKING_SPACES.has(code)) text += " ";
      else if (code === HYPHEN) text += "-";
      offset += 2;
    } else {
      if (code === TAB) text += "\t";
      offset += 2 * INLINE_CONTROL_WCHARS;
    }
  }
  return text.replace(/\n$/, "");
};

const readSectionRecords = (data: Buffer): string => {
  const paragraphs: string[] = [];
  let offset = 0;
  while (offset + 4 <= data.length) {
    const header = data.readUInt32LE(offset);
    offset += 4;
    let size = header >>> 20;
    if (size === RECORD_SIZE_EXTENDED) {
      if (offset + 4 > data.length) break;
      size = data.readUInt32LE(offset);
      offset += 4;
    }
    if ((header & 0x3ff) === HWPTAG_PARA_TEXT) {
      paragraphs.push(decodeParaText(data.subarray(offset, offset + size)));
    }
    offset += size;
  }
  return paragraphs.join("\n");
};

/** .hwp 본문 글자 추출. 암호·배포용 문서는 본문이 암호화돼 있어 빈 문자열. */
export const readHwpText = (bytes: Uint8Array): string => {
  const container = CFB.read(Buffer.from(bytes), { type: "buffer" });
  const header = findEntryContent(container, /^[^/]+\/FileHeader$/i);
  if (!header || header.subarray(0, HWP_SIGNATURE.length).toString("latin1") !== HWP_SIGNATURE) {
    throw new Error("한글(HWP 5.0) 파일이 아닙니다");
  }
  const properties = header.readUInt32LE(HEADER_PROPERTIES_OFFSET);
  if (properties & (HEADER_ENCRYPTED | HEADER_DISTRIBUTION)) return "";
  const isCompressed = (properties & HEADER_COMPRESSED) !== 0;

  return container.FullPaths.map((fullPath, index) => ({
    order: /\/BodyText\/Section(\d+)$/i.exec(fullPath)?.[1],
    content: container.FileIndex[index].content,
  }))
    .filter((section): section is { order: string; content: CFB.CFB$Blob } => section.order !== undefined && Boolean(section.content))
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map(({ content }) => {
      const raw = toBuffer(content);
      return readSectionRecords(
        isCompressed ? inflateRawSync(raw, { maxOutputLength: MAX_SECTION_BYTES }) : raw,
      );
    })
    .join("\n");
};

// ── 한글 2010 이후 개방형(.hwpx, OWPML) ─────────────────────────────
// zip 안의 Contents/section{n}.xml 에 문단(hp:p)과 글자(hp:t)가 들어 있다.

const HWPX_SECTION_PATTERN = /^Contents\/section(\d+)\.xml$/i;
// 글자 조각 또는 문단 끝. 문단 끝은 줄바꿈으로 바꾼다.
const HWPX_TEXT_PATTERN = /<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>|<\/hp:p>/g;
const XML_ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

const decodeXmlEntity = (match: string, entity: string): string => {
  if (entity.startsWith("#x") || entity.startsWith("#X")) return String.fromCodePoint(parseInt(entity.slice(2), 16));
  if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(1), 10));
  return XML_ENTITIES[entity] ?? match;
};

const decodeHwpxRun = (xml: string): string =>
  xml
    .replace(/<hp:tab\b[^>]*\/>/g, "\t")
    .replace(/<hp:lineBreak\b[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeXmlEntity);

/** .hwpx 본문 글자 추출 — 구역(section) 순서대로. */
export const readHwpxText = async (bytes: Uint8Array): Promise<string> => {
  const zip = await JSZip.loadAsync(bytes);
  const sections = Object.keys(zip.files)
    .map((name) => ({ name, order: HWPX_SECTION_PATTERN.exec(name)?.[1] }))
    .filter((section): section is { name: string; order: string } => section.order !== undefined)
    .sort((a, b) => Number(a.order) - Number(b.order));

  const texts = await Promise.all(
    sections.map(async ({ name }) => {
      const xml = await zip.files[name].async("string");
      return Array.from(xml.matchAll(HWPX_TEXT_PATTERN), (match) =>
        match[1] === undefined ? "\n" : decodeHwpxRun(match[1]),
      ).join("");
    }),
  );
  return texts.join("\n");
};
