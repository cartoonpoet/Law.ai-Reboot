import * as mammoth from "mammoth";
import { tiptapJsonToDocx } from "./tiptap-to-docx";

// 생성한 .docx 를 mammoth 로 다시 읽어 텍스트가 보존되는지 확인한다(라운드트립).
const extractText = async (buffer: Buffer): Promise<string> => (await mammoth.extractRawText({ buffer })).value;

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
});
