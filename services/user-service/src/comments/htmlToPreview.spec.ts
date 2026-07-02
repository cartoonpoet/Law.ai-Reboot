import { htmlToPreview } from "./htmlToPreview";

/**
 * htmlToPreview 단위 테스트 — 코멘트 본문(HTML) → 알림 preview.
 *
 * 프론트 `apps/web/src/pages/contract/utils/mentionHtml.ts`의 `getPlainTextFromHtml`과 알고리즘 동치.
 */
describe("htmlToPreview", () => {
  it("빈 입력은 빈 문자열", () => {
    expect(htmlToPreview("")).toBe("");
  });

  it("멘션 span 내부 텍스트(@label)는 보존하고 그 외 태그는 strip한다", () => {
    const html =
      '<p><strong>결론:</strong> <span data-mention data-id="u1">@홍길동</span> 확인 부탁</p>';
    expect(htmlToPreview(html)).toBe("결론: @홍길동 확인 부탁");
  });

  it("<br>·</p>는 공백으로 환원해 단어 경계를 보존한다", () => {
    expect(htmlToPreview("<p>줄1</p><p>줄2</p>")).toBe("줄1 줄2");
    expect(htmlToPreview("<p>A<br>B</p>")).toBe("A B");
  });

  it("script 등 위험 태그도 strip된다(텍스트는 보존)", () => {
    // 정규식 strip이므로 script 내부 텍스트가 남을 수 있음 — preview는 보안 경계가 아님(sanitize의 책임).
    // 본 테스트는 태그 자체는 제거되는 점만 확인.
    const html = "<p>안녕</p><script>alert(1)</script>";
    const out = htmlToPreview(html);
    expect(out).not.toContain("<script");
    expect(out).toContain("안녕");
  });

  it("80자 초과면 slice된다", () => {
    const long = "<p>" + "가".repeat(120) + "</p>";
    expect(htmlToPreview(long).length).toBe(80);
  });

  it("HTML 엔티티는 디코드된다", () => {
    expect(htmlToPreview("<p>A&amp;B</p>")).toBe("A&B");
  });
});
