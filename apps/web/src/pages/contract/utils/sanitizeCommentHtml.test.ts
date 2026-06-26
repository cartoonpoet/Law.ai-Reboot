import { describe, it, expect } from "vitest";
import { sanitizeCommentHtml } from "./sanitizeCommentHtml";

/**
 * sanitizeCommentHtml 단위 테스트 — DOMPurify 화이트리스트·hook 정책.
 *
 * - script/onerror/onclick 등 XSS 벡터는 제거.
 * - 멘션 data-mention/data-id 속성은 보존(강조 셀렉터가 의존).
 * - a 태그는 rel="noopener noreferrer nofollow" + target="_blank" 강제, javascript: href 차단.
 */
describe("sanitizeCommentHtml", () => {
  it("script 태그는 완전히 제거된다", () => {
    const dirty = "<p>안녕</p><script>alert(1)</script>";
    const clean = sanitizeCommentHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("alert(1)");
    expect(clean).toContain("안녕");
  });

  it("이벤트 핸들러(onerror·onclick)는 제거된다", () => {
    const dirty = '<p onclick="alert(1)">클릭</p>';
    const clean = sanitizeCommentHtml(dirty);
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("클릭");
  });

  it("멘션 data-mention/data-id는 보존된다", () => {
    const dirty = '<p><span data-mention data-id="u1">@홍</span></p>';
    const clean = sanitizeCommentHtml(dirty);
    expect(clean).toContain("data-mention");
    expect(clean).toContain('data-id="u1"');
    expect(clean).toContain("@홍");
  });

  it("a 태그에 rel/target이 강제로 부여된다", () => {
    const dirty = '<p><a href="https://example.com">link</a></p>';
    const clean = sanitizeCommentHtml(dirty);
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
    expect(clean).toContain('target="_blank"');
  });

  it("javascript: href는 제거된다", () => {
    const dirty = '<p><a href="javascript:alert(1)">x</a></p>';
    const clean = sanitizeCommentHtml(dirty);
    expect(clean).not.toMatch(/href=["']?javascript:/i);
  });

  it("허용되지 않은 태그(img·iframe·h1)는 제거된다", () => {
    const dirty =
      '<h1>큰제목</h1><p><img src="x" onerror="alert(1)"></p><iframe src="x"></iframe>';
    const clean = sanitizeCommentHtml(dirty);
    expect(clean).not.toContain("<h1");
    expect(clean).not.toContain("<img");
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("onerror");
  });
});
