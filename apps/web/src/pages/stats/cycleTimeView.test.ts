import { describe, expect, it } from "vitest";
import type { CycleTimeStage, CycleTimeStatsResponse, TenantMemberRow } from "@lawai/contracts";
import {
  buildMonthlyBars,
  buildStageBars,
  formatDays,
  formatMonthLabel,
  getDaysTone,
  getHeadline,
  getOverdueTotal,
  getOwnerOptions,
  getSlowestStage,
  getTargetPath,
  getTotalDelta,
  isEmptyStats,
} from "./cycleTimeView";

const createStage = (over: Partial<CycleTimeStage>): CycleTimeStage => ({
  status: "legalReview",
  label: "법무 검토",
  targetDays: 3,
  avgDays: null,
  medianDays: null,
  doneCount: 0,
  openCount: 0,
  overdueCount: 0,
  ...over,
});

const createResponse = (over: Partial<CycleTimeStatsResponse>): CycleTimeStatsResponse => ({
  targetType: "contract",
  from: "2026-04-01",
  to: "2026-09-19",
  total: { label: "접수 → 체결", targetDays: 10, avgDays: null, medianDays: null, doneCount: 0, openCount: 0 },
  stages: [],
  monthly: [],
  owners: [],
  overdue: [],
  recordedSince: null,
  ...over,
});

describe("formatDays", () => {
  it("값이 없으면 0 이 아니라 '아직 없음' 이다", () => {
    expect(formatDays(null)).toBe("아직 없음");
    expect(formatDays(0)).toBe("0일");
    expect(formatDays(6.5)).toBe("6.5일");
  });
});

describe("buildStageBars", () => {
  it("목표를 넘긴 만큼을 따로 떼어 초과 구간으로 준다", () => {
    const [bar] = buildStageBars([createStage({ avgDays: 6, targetDays: 3 })]);
    expect(bar.isOver).toBe(true);
    // 기준(6일) 대비 목표 3일 = 50%, 초과 3일 = 50%
    expect(bar.fillPercent).toBe(50);
    expect(bar.overPercent).toBe(50);
  });

  it("목표 안에 들어오면 초과 구간이 없다", () => {
    const [bar] = buildStageBars([createStage({ avgDays: 2, targetDays: 3 })]);
    expect(bar.isOver).toBe(false);
    expect(bar.overPercent).toBe(0);
    expect(bar.fillPercent).toBe(67);
  });

  it("평균이 없는 단계는 막대를 그리지 않는다", () => {
    const [bar] = buildStageBars([createStage({ avgDays: null })]);
    expect(bar.fillPercent).toBe(0);
    expect(bar.overPercent).toBe(0);
    expect(bar.isOver).toBe(false);
  });

  it("모든 단계를 가장 큰 값 기준으로 같은 잣대로 재운다", () => {
    const bars = buildStageBars([
      createStage({ status: "a", avgDays: 10, targetDays: 1 }),
      createStage({ status: "b", avgDays: 5, targetDays: 5 }),
    ]);
    expect(bars[0].fillPercent + bars[0].overPercent).toBe(100);
    expect(bars[1].fillPercent).toBe(50);
  });
});

describe("formatMonthLabel", () => {
  it("YYYY-MM 을 한국어로 읽는다", () => {
    expect(formatMonthLabel("2026-09")).toBe("2026년 9월");
  });
});

describe("buildMonthlyBars", () => {
  it("목표를 넘긴 달을 표시한다", () => {
    const bars = buildMonthlyBars([{ month: "2026-09", avgDays: 16, doneCount: 3 }], 10);
    expect(bars[0]).toMatchObject({ label: "2026년 9월", isOver: true, percent: 100, doneCount: 3 });
  });

  it("평균이 없는 달은 막대가 0 이다", () => {
    const bars = buildMonthlyBars([{ month: "2026-08", avgDays: null, doneCount: 0 }], 10);
    expect(bars[0]).toMatchObject({ percent: 0, isOver: false });
  });
});

describe("getTotalDelta", () => {
  it("목표보다 늦으면 초과 일수를 알려준다", () => {
    expect(getTotalDelta({ label: "", targetDays: 10, avgDays: 16, medianDays: 16, doneCount: 3, openCount: 0 })).toEqual({
      text: "6일 초과",
      isOver: true,
    });
  });

  it("목표보다 빠르면 빠른 일수를 알려준다", () => {
    expect(getTotalDelta({ label: "", targetDays: 10, avgDays: 7.5, medianDays: 7, doneCount: 3, openCount: 0 })).toEqual({
      text: "2.5일 빠름",
      isOver: false,
    });
  });

  it("끝난 건이 없으면 '아직 없음' 이다", () => {
    expect(getTotalDelta({ label: "", targetDays: 10, avgDays: null, medianDays: null, doneCount: 0, openCount: 3 })).toEqual({
      text: "아직 없음",
      isOver: false,
    });
  });
});

describe("getSlowestStage", () => {
  it("목표 대비 가장 많이 넘긴 단계를 고른다", () => {
    const slowest = getSlowestStage([
      createStage({ status: "legalReview", avgDays: 6, targetDays: 3 }),
      createStage({ status: "signing", avgDays: 6, targetDays: 5 }),
    ]);
    expect(slowest?.status).toBe("legalReview");
  });

  it("목표를 넘긴 단계가 없으면 null 이다", () => {
    expect(getSlowestStage([createStage({ avgDays: 1, targetDays: 3 })])).toBeNull();
  });
});

describe("getOverdueTotal", () => {
  it("단계별 지연 건수를 합친다", () => {
    expect(getOverdueTotal([createStage({ overdueCount: 6 }), createStage({ overdueCount: 1 })])).toBe(7);
  });
});

describe("isEmptyStats", () => {
  it("기록이 막 시작돼 아무 숫자도 없으면 빈 상태다", () => {
    expect(isEmptyStats(createResponse({ stages: [createStage({})] }))).toBe(true);
  });

  it("머물러 있는 건이 있으면 빈 상태가 아니다", () => {
    expect(isEmptyStats(createResponse({ stages: [createStage({ openCount: 18 })] }))).toBe(false);
  });

  it("끝난 건이 있으면 빈 상태가 아니다", () => {
    const total = { label: "", targetDays: 10, avgDays: 16, medianDays: 16, doneCount: 3, openCount: 0 };
    expect(isEmptyStats(createResponse({ total }))).toBe(false);
  });
});

describe("getOwnerOptions", () => {
  const createMember = (over: Partial<TenantMemberRow>): TenantMemberRow => ({
    userId: "u1",
    name: "손준호",
    avatarUrl: null,
    email: "demo@lawai.test",
    role: "inHouseCounsel",
    joinedAt: "2026-09-12T13:41:52.489Z",
    ...over,
  });

  it("외부 변호사도 담당자 후보에 들어간다", () => {
    const options = getOwnerOptions([createMember({ userId: "u4", name: "이변호사", role: "outsideCounsel" })]);
    expect(options).toContainEqual({ value: "u4", label: "이변호사" });
  });

  it("법무 담당 역할만 이름순으로 담고 맨 앞에 전체를 둔다", () => {
    const options = getOwnerOptions([
      createMember({ userId: "u1", name: "손준호", role: "inHouseCounsel" }),
      createMember({ userId: "u2", name: "김수현", role: "general" }),
      createMember({ userId: "u3", name: "박서연", role: "contractManager" }),
    ]);
    expect(options).toEqual([
      { value: "", label: "담당자 전체" },
      { value: "u3", label: "박서연" },
      { value: "u1", label: "손준호" },
    ]);
  });
});

describe("경계값", () => {
  it("평균이 목표와 같으면 초과도 빠름도 아니다", () => {
    expect(getTotalDelta({ label: "접수 → 체결", targetDays: 10, avgDays: 10, medianDays: 10, doneCount: 1, openCount: 0 })).toEqual({
      text: "목표와 같음",
      isOver: false,
    });
  });

  it("평균이 목표와 같은 단계는 초과로 보지 않는다", () => {
    const [bar] = buildStageBars([createStage({ avgDays: 3, targetDays: 3 })]);
    expect(bar.isOver).toBe(false);
    expect(bar.overPercent).toBe(0);
  });

  it("목표와 같은 달은 빨간 막대가 아니다", () => {
    const [bar] = buildMonthlyBars([{ month: "2026-09", avgDays: 10, doneCount: 2 }], 10);
    expect(bar.isOver).toBe(false);
  });

  it("목표일이 0이어도 가장 느린 단계를 고를 수 있다", () => {
    const slowest = getSlowestStage([
      createStage({ status: "unassigned", label: "접수 · 배정 대기", avgDays: 2, targetDays: 0 }),
      createStage({ status: "legalReview", label: "법무 검토", avgDays: 4, targetDays: 3 }),
    ]);
    expect(slowest?.label).toBe("접수 · 배정 대기");
  });
});

describe("getTargetPath", () => {
  it("계약과 자문 상세로 각각 보낸다", () => {
    expect(getTargetPath("contract", "c1")).toBe("/contract/c1");
    expect(getTargetPath("advice", "a1")).toBe("/advice/a1");
  });
});

describe("getDaysTone", () => {
  it("값이 없으면 흐린 톤, 목표를 넘기면 경고 톤이다", () => {
    expect(getDaysTone({ avgDays: null, isOver: false })).toBe("none");
    expect(getDaysTone({ avgDays: 6, isOver: true })).toBe("over");
    expect(getDaysTone({ avgDays: 2, isOver: false })).toBe("within");
  });
});

describe("getHeadline", () => {
  it("목표를 넘긴 단계가 있으면 그 단계를 짚어 준다", () => {
    const headline = getHeadline(createResponse({ stages: [createStage({ avgDays: 6, targetDays: 3 })] }));
    expect(headline.isWarning).toBe(true);
    expect(headline.text).toContain("법무 검토");
  });

  it("모두 목표 안이면 전체 평균을 알려준다", () => {
    const headline = getHeadline(
      createResponse({
        stages: [createStage({ avgDays: 2, targetDays: 3 })],
        total: { label: "접수 → 체결", targetDays: 10, avgDays: 8, medianDays: 8, doneCount: 3, openCount: 0 },
      }),
    );
    expect(headline).toEqual({ text: "모든 단계가 목표 안에 있어요. 전체 평균은 8일이에요.", isWarning: false });
  });

  it("끝난 건이 없으면 평균을 낼 수 없다고 밝힌다", () => {
    expect(getHeadline(createResponse({ stages: [createStage({})] })).text).toContain("평균을 낼 수 없어요");
  });
});
