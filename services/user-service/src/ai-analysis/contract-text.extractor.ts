import * as path from "path";
import { Injectable, Logger } from "@nestjs/common";
import * as mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import { R2Client } from "../files/r2.client";

// AI 에 넘길 본문 최대 길이 — 모델 입력 한도·비용을 넘지 않게 자른다(자른 경우 표시).
export const MAX_CONTRACT_TEXT_LENGTH = 60_000;
// 한 계약에서 읽을 계약서 원본 파일 수, 파일당 읽을 PDF 쪽수
const MAX_FILES = 3;
const MAX_PDF_PAGES = 60;

// 한글 PDF 는 CID 글꼴이라 문자 대응표(cmaps)가 있어야 글자가 나온다 — pdfjs-dist 에 들어 있는 파일을 쓴다.
const PDFJS_ROOT = path.dirname(require.resolve("pdfjs-dist/package.json"));

export interface ContractFileLike {
  role: string;
  name: string;
  mimeType: string | null;
  storageKey: string | null;
}

type ReadableKindTypes = "pdf" | "docx" | "text";

const getReadableKind = (file: ContractFileLike): ReadableKindTypes | null => {
  const name = file.name.toLowerCase();
  if (file.mimeType === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) return "docx";
  if (file.mimeType === "text/plain" || name.endsWith(".txt")) return "text";
  // 한글(hwp)·구형 워드(doc)·스캔 이미지는 아직 읽지 못한다.
  return null;
};

// 줄 안의 연속 공백·3줄 이상 빈 줄을 줄여 모델 입력을 아낀다.
const normalizeText = (text: string) =>
  text
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

/** PDF 글자 추출(렌더링 없이 텍스트 층만). 스캔 이미지 PDF 는 글자가 없어 빈 문자열이 된다. */
export const readPdfText = async (bytes: Uint8Array): Promise<string> => {
  const doc = await pdfjs.getDocument({
    // Node Buffer 를 그대로 넘기면 pdfjs 가 거부하므로 순수 Uint8Array 로 복사
    data: new Uint8Array(bytes),
    cMapUrl: `${PDFJS_ROOT}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_ROOT}/standard_fonts/`,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;
  try {
    const pages: string[] = [];
    const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : ""}` : "")).join(""));
    }
    return pages.join("\n");
  } finally {
    await doc.destroy();
  }
};

/**
 * 계약서 원본(role=contract) 파일에서 AI 분석용 본문을 뽑는다 — PDF·워드(docx)·텍스트.
 * 파일 하나가 실패해도 나머지는 계속 읽고, 읽을 수 있는 게 없으면 null(메타데이터만으로 분석).
 */
@Injectable()
export class ContractTextExtractor {
  private readonly logger = new Logger(ContractTextExtractor.name);

  constructor(private readonly r2: R2Client) {}

  async extract(files: ContractFileLike[]): Promise<string | null> {
    const targets = files
      .filter((f) => f.role === "contract" && f.storageKey && getReadableKind(f) !== null)
      .slice(0, MAX_FILES);

    const sections: string[] = [];
    for (const file of targets) {
      const text = await this.readFile(file);
      if (text) sections.push(`[파일: ${file.name}]\n${text}`);
    }
    if (sections.length === 0) return null;

    const joined = sections.join("\n\n");
    return joined.length > MAX_CONTRACT_TEXT_LENGTH
      ? `${joined.slice(0, MAX_CONTRACT_TEXT_LENGTH)}\n…(이하 생략: 본문이 길어 앞부분만 분석)`
      : joined;
  }

  private async readFile(file: ContractFileLike): Promise<string | null> {
    try {
      const bytes = await this.r2.getObjectBytes(file.storageKey as string);
      if (!bytes) return null;
      const kind = getReadableKind(file);
      const raw =
        kind === "pdf"
          ? await readPdfText(bytes)
          : kind === "docx"
            ? (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value
            : Buffer.from(bytes).toString("utf8");
      const text = normalizeText(raw);
      return text || null;
    } catch (error) {
      this.logger.warn(`[ai] 계약서 본문 추출 실패 (${file.name}): ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
