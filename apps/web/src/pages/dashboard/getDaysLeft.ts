const DAY_MS = 86_400_000;

const getStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** 기한까지 남은 날(달력 기준). 오늘이면 0, 지났으면 음수, 기한이 없으면 null. */
export const getDaysLeft = (dueDate: string | null, now: Date): number | null =>
  dueDate ? Math.round((getStartOfDay(new Date(dueDate)) - getStartOfDay(now)) / DAY_MS) : null;
