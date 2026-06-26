/**
 * 멘션 표시이름 정리 헬퍼.
 *
 * P1까지는 본문 직렬화 마크업(`@[표시이름](userId)`)의 정규식·파서·strip 유틸이 한 곳에 모여 있었다.
 * P2부터는 본문 직렬화가 HTML(`<span data-mention data-id>`)로 옮겨가면서 그 유틸들은
 * `./mentionHtml.ts`로 이전됐다 — 본 파일에는 디렉터리 표시이름 정리(괄호 제거)만 남는다.
 *
 * 사용처: MentionList(검색 결과 표시·suggestion picked label).
 */

/**
 * "홍길동 (영업팀)" → "홍길동". 괄호 앞 순수 이름만 trim해서 반환한다.
 * 괄호가 없으면 입력을 그대로(trim) 돌려준다.
 */
export const getDisplayName = (rawName: string): string => {
  const parenIndex = rawName.indexOf("(");
  const base = parenIndex === -1 ? rawName : rawName.slice(0, parenIndex);
  return base.trim();
};
