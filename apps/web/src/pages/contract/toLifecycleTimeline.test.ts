import { describe, it, expect } from "vitest";
import { getLifecycleProgress } from "./getLifecycleProgress";
import type { LifecycleProgressInput } from "./getLifecycleProgress";
import { toLifecycleTimeline } from "./toLifecycleTimeline";

const input = (status: LifecycleProgressInput["status"]): LifecycleProgressInput => ({
  status,
  ownerName: null,
  dueDate: null,
  signedAt: null,
  period: "-",
  approvalLine: null,
  now: new Date("2026-09-13T00:00:00Z"),
});

describe("toLifecycleTimeline", () => {
  it("최근 완료 2단계만 펼치고 그 이전 완료 단계는 한 줄로 접는다", () => {
    const items = toLifecycleTimeline(getLifecycleProgress(input("signing")));
    expect(items[0]).toMatchObject({ id: "folded", title: "완료 4단계", status: "done" });
    expect(items[0].description).toBe("임시 저장 → 검토 의뢰 → 배정 → 법무 검토");
    expect(items.map((i) => i.id)).toEqual(["folded", "요청자 검토", "검토 완료", "체결 진행", "체결 완료", "계약 이행", "계약 종료"]);
    expect(items.find((i) => i.id === "체결 진행")?.status).toBe("current");
    expect(items.find((i) => i.id === "체결 완료")).toMatchObject({ status: "upcoming", description: "체결 · 다음 단계" });
  });

  it("앞선 완료 단계가 2개 이하면 접지 않는다", () => {
    const items = toLifecycleTimeline(getLifecycleProgress(input("assigning")));
    expect(items.some((i) => i.id === "folded")).toBe(false);
    expect(items).toHaveLength(10);
  });
});
