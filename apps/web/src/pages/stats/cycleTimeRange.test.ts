import { describe, expect, it } from "vitest";
import { formatRangeText, formatRecordedSince, getPresetRange } from "./cycleTimeRange";

describe("getPresetRange", () => {
  it("최근 6개월은 5개월 전 1일부터 오늘까지다", () => {
    expect(getPresetRange("6m", new Date("2026-09-19T05:00:00Z"))).toEqual({
      from: "2026-04-01",
      to: "2026-09-19",
    });
  });

  it("최근 3개월은 2개월 전 1일부터다", () => {
    expect(getPresetRange("3m", new Date("2026-09-19T05:00:00Z")).from).toBe("2026-07-01");
  });

  it("해가 바뀌어도 달을 거슬러 센다", () => {
    expect(getPresetRange("12m", new Date("2026-02-10T00:00:00Z")).from).toBe("2025-03-01");
  });

  // 한국 시간 기준이라 오전 9시 이전에도 "오늘"이 어제로 밀리지 않는다.
  it("한국 시간 새벽에도 오늘까지로 잡는다", () => {
    expect(getPresetRange("6m", new Date("2026-09-18T15:30:00Z"))).toEqual({
      from: "2026-04-01",
      to: "2026-09-19",
    });
  });

  // UTC 로 계산하면 매월 1일 오전에 한 달이 통째로 밀린다.
  it("한국 시간으로 1일 오전이면 그달까지 센다", () => {
    expect(getPresetRange("6m", new Date("2026-08-31T23:00:00Z"))).toEqual({
      from: "2026-04-01",
      to: "2026-09-01",
    });
  });
});

describe("formatRangeText", () => {
  it("기간을 물결표로 잇는다", () => {
    expect(formatRangeText({ from: "2026-04-01", to: "2026-09-19" })).toBe("2026-04-01 ~ 2026-09-19");
  });
});

describe("formatRecordedSince", () => {
  it("기록 시작 시각을 한국 시간 날짜로 바꾼다", () => {
    expect(formatRecordedSince("2026-08-21T01:26:00.721Z")).toBe("2026-08-21");
  });

  it("한국 시간으로 날짜가 넘어간 시각도 그날로 본다", () => {
    expect(formatRecordedSince("2026-08-20T16:00:00.000Z")).toBe("2026-08-21");
  });

  it("기록이 없으면 null 이다", () => {
    expect(formatRecordedSince(null)).toBeNull();
  });
});
