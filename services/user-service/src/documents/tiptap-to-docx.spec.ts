import JSZip from "jszip";
import * as mammoth from "mammoth";
import { tiptapJsonToDocx } from "./tiptap-to-docx";

// 생성한 .docx 를 mammoth 로 다시 읽어 텍스트가 보존되는지 확인한다(라운드트립).
const extractText = async (buffer: Buffer): Promise<string> => (await mammoth.extractRawText({ buffer })).value;

// mammoth.extractRawText 는 numId·ilvl(번호/중첩 정보)를 전혀 담지 않으므로, .docx 를 zip 으로 직접 열어
// word/document.xml 을 파싱해 번호목록 검증을 한다. 문단(<w:p>) 단위로 잘라 각 문단의 텍스트·numId·ilvl 을 뽑는다.
interface ParsedParagraph {
  text: string;
  numId: string | undefined;
  ilvl: string | undefined;
}

const parseDocumentParagraphs = async (buffer: Buffer): Promise<ParsedParagraph[]> => {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("word/document.xml 을 찾을 수 없다");
  const paragraphBlocks = documentXml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  return paragraphBlocks.map((block) => {
    const text = [...block.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1]).join("");
    const numId = block.match(/<w:numId w:val="(\d+)"\s*\/>/)?.[1];
    const ilvl = block.match(/<w:ilvl w:val="(\d+)"\s*\/>/)?.[1];
    return { text, numId, ilvl };
  });
};

const findParagraphContaining = (paragraphs: ParsedParagraph[], text: string): ParsedParagraph => {
  const found = paragraphs.find((paragraph) => paragraph.text.includes(text));
  if (!found) throw new Error(`"${text}" 를 포함하는 문단을 찾지 못했다`);
  return found;
};

describe("tiptapJsonToDocx", () => {
  it("제목(1~3)·문단·굵게/기울임/밑줄/취소선을 지원한다", async () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "비밀유지계약서" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "제1조 (목적)" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "굵은 글자" },
            { type: "text", text: " 보통 " },
            { type: "text", marks: [{ type: "italic" }, { type: "underline" }], text: "기울임밑줄" },
          ],
        },
      ],
    };
    const buffer = await tiptapJsonToDocx(doc);
    const text = await extractText(buffer);
    expect(text).toContain("비밀유지계약서");
    expect(text).toContain("제1조 (목적)");
    expect(text).toContain("굵은 글자");
    expect(text).toContain("기울임밑줄");
  });

  it("글머리·번호 목록(중첩 포함)을 지원한다", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "첫째" }] },
                {
                  type: "bulletList",
                  content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "둘째-중첩" }] }] }],
                },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "번호항목" }] }] }],
        },
      ],
    };
    const text = await extractText(await tiptapJsonToDocx(doc));
    expect(text).toContain("첫째");
    expect(text).toContain("둘째-중첩");
    expect(text).toContain("번호항목");
  });

  it("표를 지원한다", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "구분" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "내용" }] }] },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "기술" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "설계도" }] }] },
              ],
            },
          ],
        },
      ],
    };
    const text = await extractText(await tiptapJsonToDocx(doc));
    expect(text).toContain("구분");
    expect(text).toContain("설계도");
  });

  it("정렬·글자색·하이라이트·구분선이 있어도 변환에 실패하지 않는다", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center" },
          content: [
            { type: "text", marks: [{ type: "textStyle", attrs: { color: "#c0392b" } }], text: "빨간 글자" },
            { type: "text", marks: [{ type: "highlight", attrs: { color: "#fff2a8" } }], text: "형광펜" },
          ],
        },
        { type: "horizontalRule" },
        { type: "paragraph", content: [{ type: "text", text: "끝" }] },
      ],
    };
    const text = await extractText(await tiptapJsonToDocx(doc));
    expect(text).toContain("빨간 글자");
    expect(text).toContain("형광펜");
    expect(text).toContain("끝");
  });

  it("빈 문서(content 없음)도 유효한 .docx 를 만든다", async () => {
    const buffer = await tiptapJsonToDocx({ type: "doc", content: [] });
    expect(buffer.byteLength).toBeGreaterThan(0);
    const text = await extractText(buffer);
    expect(text.trim()).toBe("");
  });

  it("서로 다른 최상위 번호목록 두 개는 numId 를 공유하지 않는다(각각 1부터 다시 시작)", async () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "제3조" }] },
        {
          type: "orderedList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "제3조-첫째" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "제3조-둘째" }] }] },
          ],
        },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "제5조" }] },
        {
          type: "orderedList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "제5조-첫째" }] }] }],
        },
      ],
    };
    const buffer = await tiptapJsonToDocx(doc);
    const paragraphs = await parseDocumentParagraphs(buffer);

    const firstListFirstItem = findParagraphContaining(paragraphs, "제3조-첫째");
    const firstListSecondItem = findParagraphContaining(paragraphs, "제3조-둘째");
    const secondListFirstItem = findParagraphContaining(paragraphs, "제5조-첫째");

    expect(firstListFirstItem.numId).toBeDefined();
    expect(secondListFirstItem.numId).toBeDefined();
    // 같은 목록 안의 항목은 numId 를 공유해야 한다.
    expect(firstListSecondItem.numId).toBe(firstListFirstItem.numId);
    // 서로 다른(형제) 목록은 numId 가 달라야 한다 — 같으면 두 번째 목록이 1부터 다시 시작하지 못하고 이어서 센다.
    expect(secondListFirstItem.numId).not.toBe(firstListFirstItem.numId);
  });

  it("중첩된 번호목록 항목은 부모보다 더 깊은 ilvl 을 갖는다", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "부모항목" }] },
                {
                  type: "orderedList",
                  content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "자식항목" }] }] }],
                },
              ],
            },
          ],
        },
      ],
    };
    const buffer = await tiptapJsonToDocx(doc);
    const paragraphs = await parseDocumentParagraphs(buffer);

    const parentItem = findParagraphContaining(paragraphs, "부모항목");
    const childItem = findParagraphContaining(paragraphs, "자식항목");

    // 같은 최상위 목록에 속한 중첩 항목이므로 numId 는 공유해야 한다(레벨만 깊어져야 함).
    expect(childItem.numId).toBe(parentItem.numId);
    expect(Number(childItem.ilvl)).toBeGreaterThan(Number(parentItem.ilvl ?? "0"));
  });
});
