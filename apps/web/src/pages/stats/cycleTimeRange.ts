// 업무 통계 기간 선택 — 화면은 "최근 N개월" 만 고르고, 실제 날짜는 여기서 만든다.
// 날짜는 모두 한국 시간 기준이다. UTC 로 계산하면 오전 9시 이전에는 "오늘"이 어제가 되고,
// 매월 1일 오전에는 한 달이 통째로 밀린다(화면에 그 날짜가 그대로 찍히므로 바로 눈에 띈다).

export type RangePresetTypes = "3m" | "6m" | "12m";

export interface RangeTypes {
  /** YYYY-MM-DD */
  from: string;
  to: string;
}

export const RANGE_PRESETS: { value: RangePresetTypes; label: string; months: number }[] = [
  { value: "3m", label: "최근 3개월", months: 3 },
  { value: "6m", label: "최근 6개월", months: 6 },
  { value: "12m", label: "최근 12개월", months: 12 },
];

export const DEFAULT_RANGE_PRESET: RangePresetTypes = "6m";

const getMonths = (preset: RangePresetTypes): number =>
  RANGE_PRESETS.find((item) => item.value === preset)?.months ??
  RANGE_PRESETS.find((item) => item.value === DEFAULT_RANGE_PRESET)!.months;

const SEOUL = "Asia/Seoul";

/** 한국 시간 기준 YYYY-MM-DD. sv-SE 로케일이 그 형식을 그대로 준다. */
const toSeoulDateText = (date: Date): string => date.toLocaleDateString("sv-SE", { timeZone: SEOUL });

/** 한국 시간 기준의 연·월·일. */
const getSeoulParts = (date: Date): { year: number; month: number; day: number } => {
  const [year, month, day] = toSeoulDateText(date).split("-").map(Number);
  return { year, month, day };
};

/** "최근 N개월" = N개월 전 그 달 1일부터 오늘까지(한국 시간 기준, 서버 기본 계산과 같은 방식). */
export const getPresetRange = (preset: RangePresetTypes, now: Date): RangeTypes => {
  const months = getMonths(preset);
  const today = getSeoulParts(now);
  // 월을 빼면서 연도가 넘어가는 것은 Date 가 알아서 처리한다(UTC 로 만들어도 날짜만 읽으므로 안전).
  const start = new Date(Date.UTC(today.year, today.month - 1 - (months - 1), 1));
  return {
    from: start.toISOString().slice(0, 10),
    to: toSeoulDateText(now),
  };
};

/** 2026-04-01 ~ 2026-09-19 */
export const formatRangeText = (range: RangeTypes): string => `${range.from} ~ ${range.to}`;

/** 기록 시작 시각 → 화면에 밝힐 날짜(한국 시간). 없으면 null(안내 문구를 숨긴다). */
export const formatRecordedSince = (recordedSince: string | null): string | null =>
  recordedSince ? toSeoulDateText(new Date(recordedSince)) : null;
