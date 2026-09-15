const MAX_BADGE_COUNT = 99;

// 안 읽은 알림 배지 문구 — 99 를 넘으면 99+.
export const getUnreadBadgeLabel = (count: number) =>
  count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
