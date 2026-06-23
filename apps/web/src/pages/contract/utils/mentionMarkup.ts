/**
 * 코멘트 인라인 @멘션 마크업 단일 출처.
 *
 * body는 `@[표시이름](userId)` 정규 마크업 문자열로 저장한다. 저장 직렬화 ·
 * 수정 복원 파싱 · 읽기 표시 파서 · 서버 buildPreview strip 네 곳이 모두
 * 이 규칙(MENTION_PATTERN)을 공유한다. 서버(comments.service.ts)는 동일
 * 정규식을 복제하므로 패턴을 바꾸면 양쪽을 함께 수정해야 한다.
 *
 * 표시이름은 getDisplayName으로 부서 괄호를 제거한 순수 이름만 쓴다
 * → 이름에 `]`/`)` 가 들어가지 않으므로 패턴이 안전하게 파싱된다.
 * 순수 함수만 모은다(부수효과 없음).
 */

/** `@[표시이름](userId)` 매칭. 표시이름은 `]` 미포함, userId는 `)` 미포함 전제. */
export const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

/** 본문을 표시·복원 공유용 세그먼트 단위로 쪼갠 결과. */
export type MentionSegment =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; userId: string };

/**
 * "홍길동 (영업팀)" → "홍길동". 괄호 앞 순수 이름만 trim해서 반환한다.
 * 괄호가 없으면 입력을 그대로(trim) 돌려준다.
 */
export const getDisplayName = (rawName: string): string => {
  const parenIndex = rawName.indexOf("(");
  const base = parenIndex === -1 ? rawName : rawName.slice(0, parenIndex);
  return base.trim();
};

/** 멘션 1개를 `@[표시이름](userId)` 마크업으로 직렬화한다. */
export const serializeMention = (name: string, userId: string): string =>
  `@[${getDisplayName(name)}](${userId})`;

/**
 * body 문자열을 `{ type:"text" } | { type:"mention" }` 세그먼트 배열로 파싱한다.
 * 읽기 표시(인라인 하이라이트)·수정 복원(노드 변환)이 공유한다.
 */
export const parseMentionMarkup = (body: string): MentionSegment[] => {
  const segments: MentionSegment[] = [];
  const pattern = new RegExp(MENTION_PATTERN.source, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, match.index) });
    }
    segments.push({ type: "mention", name: match[1], userId: match[2] });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }
  return segments;
};

/** body에서 멘션된 userId를 추출해 중복 제거(등장 순서 유지)한다. */
export const extractMentionUserIds = (body: string): string[] => {
  const pattern = new RegExp(MENTION_PATTERN.source, "g");
  const userIds: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const userId = match[2];
    if (!seen.has(userId)) {
      seen.add(userId);
      userIds.push(userId);
    }
  }
  return userIds;
};

/**
 * `@[홍길동](userId)` → `@홍길동`. 마크업을 표시이름으로 치환한다(preview/요약용).
 * 서버 comments.service.ts buildPreview의 strip 정규식과 1:1 동일해야 한다.
 */
export const stripMentionMarkup = (body: string): string =>
  body.replace(new RegExp(MENTION_PATTERN.source, "g"), "@$1");
