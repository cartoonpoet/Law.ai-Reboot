import DOMPurify from "dompurify";

/**
 * 코멘트 본문 sanitize 단일 출처(P2).
 *
 * comment.body는 tiptap이 산출한 HTML 단편(p/strong/em/u/s/ul/ol/li/a/blockquote/span/h4 + 멘션
 * span data-mention data-id). DOMPurify가 화이트리스트만 보존하고 그 외 태그·이벤트·`javascript:` URL을
 * 제거한다. 저장은 클라이언트 스키마(tiptap)가 1차 필터링, 표시는 본 sanitize가 2차 방어.
 *
 * 단일 출처 정책 — 본 함수 외 어디서도 DOMPurify를 호출하지 않는다(CommentItem에서만 사용).
 */

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "span",
  "h4",
];

const ALLOWED_ATTR = ["href", "rel", "target", "data-mention", "data-id", "class"];

const ALLOWED_LINK_PROTOCOLS = /^(https?:|mailto:)/i;

/**
 * DOMPurify 전역 hook 등록(모듈 로드 시 1회).
 *
 * `addHook`은 DOMPurify 싱글턴 상태를 변이하는 부수효과라, 호출 함수 안에 숨기지 않고
 * 모듈 평가 시점에 명시적으로 1회 실행한다(ff-review 예측가능성 지적 반영). 이렇게 두면
 * `sanitizeCommentHtml` 함수는 순수 변환으로만 읽히고, 부수효과 발생 위치는 모듈 임포트
 * 시점으로 고정된다.
 *
 * - `a` 태그 href는 `https?:`/`mailto:` 외 차단.
 * - 모든 `a`에 `rel="noopener noreferrer nofollow"` + `target="_blank"` 강제(에디터
 *   schema가 빠뜨려도 보장).
 */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    const href = node.getAttribute("href");
    if (href && !ALLOWED_LINK_PROTOCOLS.test(href)) {
      node.removeAttribute("href");
    }
    node.setAttribute("rel", "noopener noreferrer nofollow");
    node.setAttribute("target", "_blank");
  }
});

/**
 * 코멘트 본문 HTML을 sanitize한다. 멘션 식별자(`data-mention`·`data-id`)는 보존되고
 * 강조 스타일은 commentItem.css.ts의 globalStyle `[data-mention]` 셀렉터가 적용한다.
 */
export const sanitizeCommentHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
  });
