import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toISODate, isoToDate } from "./dateIso";

// I-TZ 회귀 테스트: toISODate 가 UTC 변환이 아니라 로컬 캘린더 날짜를 그대로 문자열로
// 만드는지 UTC+ 시간대(KST)에서 고정 검증한다. 버그가 있던 구현(`date.toISOString().slice(0,10)`)
// 은 KST 자정 근처 날짜를 하루 전으로 저장했다 — 이 테스트가 그 재발을 막는다.
describe("dateIso (I-TZ 회귀 방지)", () => {
  beforeEach(() => {
    // vi.stubEnv 를 쓴다 — `process.env.TZ = ORIGINAL_TZ` 로 직접 복원하면 ORIGINAL_TZ 가
    // undefined 일 때 문자열 "undefined" 가 그대로 써져서(env 변수는 항상 문자열) 이후
    // 같은 워커에서 도는 다른 테스트 파일에 UTC 대신 엉뚱한 TZ 가 새어나간다.
    // vi.unstubAllEnvs() 는 원래 값이 없었으면 실제로 키 자체를 지워서 이 문제가 없다.
    vi.stubEnv("TZ", "Asia/Seoul"); // UTC+9 — 버그가 실제로 관측된 시간대.
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("KST 자정 근처 날짜를 골라도 같은 날짜 문자열을 만든다(하루 밀리지 않음)", () => {
    // InputDatePicker 가 만드는 것과 동일한 "로컬 자정" Date.
    const pickedLocalMidnight = new Date(2026, 8, 12); // 2026-09-12 00:00 KST
    expect(toISODate(pickedLocalMidnight)).toBe("2026-09-12");

    // 버그 재현 확인: 고쳐지기 전 구현이었다면 이 값은 "2026-09-11" 이었다.
    expect(toISODate(pickedLocalMidnight)).not.toBe("2026-09-11");
  });

  it("연말 자정 경계에서도 하루 밀리지 않는다", () => {
    const newYearEveLocalMidnight = new Date(2026, 11, 31); // 2026-12-31 00:00 KST
    expect(toISODate(newYearEveLocalMidnight)).toBe("2026-12-31");
  });

  it("null 은 빈 문자열", () => {
    expect(toISODate(null)).toBe("");
  });

  it("isoToDate 는 저장된 문자열을 다시 같은 로컬 캘린더 날짜로 복원한다(왕복 대칭)", () => {
    const original = new Date(2026, 8, 12);
    const iso = toISODate(original);
    const restored = isoToDate(iso);
    expect(restored?.getFullYear()).toBe(2026);
    expect(restored?.getMonth()).toBe(8); // 0-indexed: 9월
    expect(restored?.getDate()).toBe(12);
  });

  it("isoToDate 빈 문자열은 null", () => {
    expect(isoToDate("")).toBeNull();
  });
});
