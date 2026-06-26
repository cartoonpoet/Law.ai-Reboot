/**
 * 코멘트 본문(HTML 단편) → 알림 미리보기 텍스트.
 *
 * P2부터 코멘트 본문은 tiptap이 산출한 HTML이며 멘션은 `<span data-mention data-id>@label</span>`로 직렬화된다.
 * 본 모듈은 알림 detail.preview·멘션 이메일 preview에 들어갈 plain-text 요약을 만든다 — 멘션은 `@label`로
 * 보존하고, 그 외 태그는 strip한 뒤 공백 정규화·길이 제한을 적용한다.
 *
 * 프론트 `apps/web/src/pages/contract/utils/mentionHtml.ts`의 `getPlainTextFromHtml`과 알고리즘이 동치:
 * - 멘션 span → 내부 텍스트 그대로(@label)
 * - <br>/</p> → 공백
 * - 그 외 태그 → 제거
 * - HTML 엔티티 디코드
 *
 * Node 환경에는 DOMParser가 없어 정규식 기반(의존성 0) — 입력은 tiptap이 산출한 신뢰 가능한 HTML임을
 * 전제로 한다(공격 입력은 sanitize의 책임).
 */

/** 알림 detail.preview 최대 길이. */
export const PREVIEW_LEN = 80;

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const decodeEntities = (text: string): string =>
  text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITY_MAP[match] ?? match);

/**
 * HTML 단편을 plain text로 환원하고 길이 제한(slice 80자)을 적용한다.
 * 빈 입력은 빈 문자열.
 *
 * **전제(예측가능성)**: 멘션 span 내부는 텍스트 노드만 포함한다고 가정한다(tiptap이
 * 산출하는 직렬화 규약 — `<span data-mention data-id>@label</span>`). 멘션 span 내부에
 * 다른 인라인 마크가 중첩되면 1단계 패턴이 내부 태그까지 함께 보존하지만, 3단계의
 * `<[^>]+>` strip이 잔여 태그를 제거해 silent하게 텍스트만 남는다 — 이 가정이 깨질
 * 가능성이 있으면 본 함수의 출력은 부분적으로 예측 불가다.
 */
export const htmlToPreview = (html: string): string => {
  if (!html) return "";
  // 1) 멘션 span은 내부 텍스트(@label)만 보존. data-mention 속성 유무 기준.
  let result = html.replace(
    /<span\b[^>]*\bdata-mention\b[^>]*>([\s\S]*?)<\/span>/gi,
    "$1",
  );
  // 2) <br>·</p>는 공백으로 정규화 — 단어 경계 보존.
  result = result.replace(/<br\s*\/?>(?=\S)/gi, " ").replace(/<br\s*\/?>/gi, " ");
  result = result.replace(/<\/p>/gi, " ");
  // 3) 남은 태그 제거.
  result = result.replace(/<[^>]+>/g, "");
  // 4) HTML 엔티티 디코드.
  result = decodeEntities(result);
  // 5) 공백 정규화 + trim + 길이 제한.
  return result.replace(/\s+/g, " ").trim().slice(0, PREVIEW_LEN);
};
