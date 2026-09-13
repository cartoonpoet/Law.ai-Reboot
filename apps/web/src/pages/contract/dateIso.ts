// 폼 date 필드 ⟷ InputDatePicker(Date) 변환 — 계약 기간/계약예정일/체결일이 공유하는 단일 출처.
//
// toISODate 는 반드시 로컬 캘린더 날짜(년/월/일)로 문자열을 만들어야 한다.
// `date.toISOString()` 은 Date 를 UTC 로 변환한 뒤 문자열을 뽑으므로, UTC+ 시간대(KST 등)에서
// 자정 근처 날짜를 고르면 하루 전 날짜로 저장되는 버그가 생긴다(예: KST 2026-09-12 00:00 는
// UTC 로 2026-09-11 15:00 이라 slice(0,10) 하면 "2026-09-11" 이 나온다). 서버는 형식만
// 검증하므로("체결일이 올바르지 않습니다") 이런 "형식은 맞지만 하루 틀린" 값은 절대 못 잡는다.
export const toISODate = (date: Date | null): string => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// isoToDate 도 같은 이유로 로컬 기준으로 파싱한다. `new Date("YYYY-MM-DD")` 는 날짜-only
// ISO 문자열을 UTC 자정으로 해석하므로, UTC- 시간대(미주 등)에서는 하루 전 날짜로 표시된다
// (이 배포는 KST 기준이라 지금 당장 증상은 없지만, 대칭성을 위해 여기서도 로컬로 파싱한다).
export const isoToDate = (iso: string): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
