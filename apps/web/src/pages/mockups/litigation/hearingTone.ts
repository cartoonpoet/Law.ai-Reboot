export type HearingToneTypes = "hearing" | "verdict" | "deadline";

/** 기일 종류 → 색. 선고는 초록, 제출·납부 기한은 주황, 나머지 변론·준비기일은 파랑. */
export const getHearingTone = (kind: string): HearingToneTypes => {
  if (kind.includes("선고")) return "verdict";
  if (kind.includes("기한")) return "deadline";
  return "hearing";
};
