/**
 * 코멘트 본문 HTML 헬퍼 — P2 직렬화 단일 출처.
 *
 * P1까지는 본문이 `@[표시이름](userId)` 마크업이었으나(mentionMarkup.ts), P2부터는
 * tiptap이 산출하는 HTML 단편을 그대로 저장한다. 멘션은 `<span data-mention data-id="<userId>">@label</span>`로
 * 직렬화된다(MentionEditor에서 renderHTML 오버라이드). 본 파일은 HTML 본문에서 멘션 userId를
 * 추출하고(submit/save), 본문이 비었는지 검증(plain text 기준)하는 순수 함수만 모은다.
 *
 * 사용처: CommentForm(submit), CommentItem(handleSave), 그리고 서버 알림 preview는
 * 서버 측 htmlToPreview(comments.service.ts)와 알고리즘 동치.
 */

/** 멘션 span 식별 속성 — Mention 노드 renderHTML/parseHTML이 공유한다. */
export const MENTION_DATA_ATTR = "data-mention";

/** 표시이름 라벨 추출에 쓰는 data-id 속성명(가독성 상수). */
export const MENTION_ID_ATTR = "data-id";

/**
 * 본문 HTML을 DOM으로 파싱해 멘션된 userId를 등장순으로 추출한다.
 * 중복은 제거(첫 등장 보존). 빈 입력·멘션 없는 본문은 빈 배열.
 */
export const extractMentionUserIdsFromHtml = (html: string): string[] => {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = doc.querySelectorAll(`span[${MENTION_DATA_ATTR}]`);
  const ids: string[] = [];
  const seen = new Set<string>();
  nodes.forEach((node) => {
    const id = node.getAttribute(MENTION_ID_ATTR);
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
};

/**
 * HTML을 plain text로 환원한다. 멘션 span은 `@label`로 치환(텍스트 노드 내용 그대로 사용),
 * 그 외 태그는 textContent로 환원해 빈 본문 검증·미리보기 동치성 비교에 쓴다.
 *
 * - <br>은 공백으로 정규화 — textContent는 br을 빈 문자열로 다루므로 보조 전처리.
 * - HTML 엔티티는 DOMParser가 자동 디코드.
 */
export const getPlainTextFromHtml = (html: string): string => {
  if (!html) return "";
  // DOMParser는 <br>을 textContent에 빈 문자열로 반영해 단어가 붙어 보이는 문제가 있다.
  // 미리 공백으로 치환해 단어 경계를 보존한 뒤 파싱한다.
  const withBreaks = html.replace(/<br\s*\/?>(?=\S)/gi, " ").replace(/<br\s*\/?>/gi, " ");
  const doc = new DOMParser().parseFromString(withBreaks, "text/html");
  return doc.body.textContent ?? "";
};

/**
 * 본문 HTML이 의미상 비었는지 판정한다. tiptap 빈 에디터는 `<p></p>`를 산출하므로
 * 단순 string check가 아니라 plain text 환원 + trim 길이로 판정해야 한다.
 */
export const isHtmlBlank = (html: string): boolean =>
  getPlainTextFromHtml(html).trim().length === 0;
