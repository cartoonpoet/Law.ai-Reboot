import { describe, it, expect } from "vitest";
import {
  extractMentionUserIdsFromHtml,
  getPlainTextFromHtml,
  isHtmlBlank,
} from "./mentionHtml";

/**
 * mentionHtml 단위 테스트 — P2 HTML 직렬화 규약(`<span data-mention data-id>`) 헬퍼.
 *
 * 추출(extract)·plain text 환원(preview/검증)·빈 본문 판정의 라운드트립과 엣지를 검증한다.
 */
describe("mentionHtml", () => {
  describe("extractMentionUserIdsFromHtml", () => {
    it("빈 입력은 빈 배열을 반환한다", () => {
      expect(extractMentionUserIdsFromHtml("")).toEqual([]);
    });

    it("멘션 없는 본문은 빈 배열을 반환한다", () => {
      expect(extractMentionUserIdsFromHtml("<p>그냥 텍스트</p>")).toEqual([]);
    });

    it("data-mention span에서 data-id를 등장순으로 추출한다", () => {
      const html =
        '<p>안녕 <span data-mention data-id="u1">@홍길동</span> 확인 <span data-mention data-id="u2">@김철수</span></p>';
      expect(extractMentionUserIdsFromHtml(html)).toEqual(["u1", "u2"]);
    });

    it("중복 data-id는 제거(첫 등장 보존)한다", () => {
      const html =
        '<p><span data-mention data-id="u1">@홍</span> 그리고 <span data-mention data-id="u1">@홍</span></p>';
      expect(extractMentionUserIdsFromHtml(html)).toEqual(["u1"]);
    });

    it("data-mention 없는 일반 span은 무시한다", () => {
      const html = '<p><span class="other">@아닌사람</span></p>';
      expect(extractMentionUserIdsFromHtml(html)).toEqual([]);
    });
  });

  describe("getPlainTextFromHtml", () => {
    it("빈 입력은 빈 문자열", () => {
      expect(getPlainTextFromHtml("")).toBe("");
    });

    it("멘션 span 내부 텍스트(@label)를 그대로 보존하고 그 외 태그는 strip한다", () => {
      const html =
        '<p><strong>결론:</strong> <span data-mention data-id="u1">@홍길동</span> 확인 부탁</p>';
      expect(getPlainTextFromHtml(html)).toBe("결론: @홍길동 확인 부탁");
    });

    it("HTML 엔티티는 디코드한다", () => {
      expect(getPlainTextFromHtml("<p>A&amp;B &lt;tag&gt;</p>")).toBe("A&B <tag>");
    });

    it("<br>은 공백으로 환원해 단어 경계를 보존한다", () => {
      expect(getPlainTextFromHtml("<p>줄1<br>줄2</p>")).toContain("줄1 줄2");
    });
  });

  describe("isHtmlBlank", () => {
    it("빈 문자열·`<p></p>`는 blank로 판정", () => {
      expect(isHtmlBlank("")).toBe(true);
      expect(isHtmlBlank("<p></p>")).toBe(true);
      expect(isHtmlBlank("<p>   </p>")).toBe(true);
    });

    it("텍스트가 있으면 blank가 아니다", () => {
      expect(isHtmlBlank("<p>내용</p>")).toBe(false);
    });

    it("멘션만 있어도 blank가 아니다(@label이 텍스트로 환원)", () => {
      expect(
        isHtmlBlank('<p><span data-mention data-id="u1">@홍</span></p>'),
      ).toBe(false);
    });
  });
});
