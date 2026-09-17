const DAY_MS = 86_400_000;

// 회신 기한(날짜만 저장, UTC 자정)까지 남은 날 — 시각은 무시한다. 기한이 없으면 null, 지났으면 음수.
export const getDaysLeft = (dueDate: string | null, now: Date): number | null => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dueDay - today) / DAY_MS);
};

// 접수 후 며칠째인지 — 접수 시각은 보는 사람 날짜로 센다(오늘 접수면 0).
export const getElapsedDays = (createdAt: string, now: Date): number => {
  const created = new Date(createdAt);
  const createdDay = Date.UTC(created.getFullYear(), created.getMonth(), created.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - createdDay) / DAY_MS));
};
