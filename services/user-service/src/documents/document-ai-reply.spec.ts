import { parseDraftHtml, parseReviewJson, parseRewriteText } from "./document-ai-reply";

describe("document-ai-reply", () => {
  it("parseDraftHtml — 코드펜스를 벗긴다", () => {
    expect(parseDraftHtml("```html\n<h1>제목</h1>\n```")).toBe("<h1>제목</h1>");
    expect(parseDraftHtml("<p>그대로</p>")).toBe("<p>그대로</p>");
    expect(parseDraftHtml("")).toBeNull();
  });

  it("parseRewriteText — 따옴표·코드펜스를 벗긴다", () => {
    expect(parseRewriteText('"다듬은 문장"')).toBe("다듬은 문장");
    expect(parseRewriteText("```\n그대로\n```")).toBe("그대로");
  });

  it("parseReviewJson — 유효한 findings만 남긴다", () => {
    const content = JSON.stringify({
      findings: [
        { severity: "danger", kind: "위험 조항", title: "제목", where: "제1조", note: "설명" },
        { severity: "unknown", kind: "위험 조항", title: "무효", where: "x", note: "x" },
      ],
    });
    const findings = parseReviewJson(content);
    expect(findings).toHaveLength(1);
    expect(findings?.[0].title).toBe("제목");
  });

  it("parseReviewJson — JSON이 아니면 null", () => {
    expect(parseReviewJson("이건 JSON이 아닙니다")).toBeNull();
  });
});
