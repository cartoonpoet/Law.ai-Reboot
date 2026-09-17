import { describe, expect, it } from "vitest";
import { getAdviceProgress } from "./getAdviceProgress";
import { getDaysLeft, getElapsedDays } from "./getDaysLeft";

const NOW = new Date(2026, 8, 16, 15, 0);
const base = {
  status: "reviewing" as const,
  owner: { id: "o", name: "박지훈", dept: "법무팀" },
  requester: { id: "r", name: "김수현", dept: "영업1팀" },
  dueDate: "2026-09-18T00:00:00.000Z",
  answeredAt: null,
  closedAt: null,
};

describe("getAdviceProgress", () => {
  it("검토 중이면 3/6 단계, 담당자와 남은 기한을 보여준다", () => {
    const progress = getAdviceProgress(base, NOW);
    expect(progress.currentIndex).toBe(2);
    expect(progress.percent).toBe(33);
    expect(progress.note).toBe("박지훈 검토 중 · 회신기한 D-2");
    expect(progress.steps.map((step) => step.state)).toEqual(["done", "done", "current", "todo", "todo", "todo"]);
  });

  it("답변 대기는 추가 질의 단계, 요청자를 기다린다고 알린다", () => {
    const progress = getAdviceProgress({ ...base, status: "waitingRequester" }, NOW);
    expect(progress.steps[progress.currentIndex].label).toBe("추가 질의");
    expect(progress.note).toBe("김수현 답변 대기 · 회신기한 D-2");
  });

  it("기한이 지나면 지난 일수를 보여준다", () => {
    expect(getAdviceProgress({ ...base, dueDate: "2026-09-14T00:00:00.000Z" }, NOW).note).toBe("박지훈 검토 중 · 회신기한 D+2 지남");
  });

  it("종결은 100%", () => {
    const progress = getAdviceProgress({ ...base, status: "closed", closedAt: "2026-09-20T01:00:00.000Z" }, NOW);
    expect(progress.percent).toBe(100);
    expect(progress.note).toBe("종결일 2026-09-20");
  });
});

describe("getDaysLeft", () => {
  it("시각과 관계없이 날짜 차이만 센다", () => {
    expect(getDaysLeft("2026-09-16T00:00:00.000Z", NOW)).toBe(0);
    expect(getDaysLeft("2026-09-17T00:00:00.000Z", NOW)).toBe(1);
    expect(getDaysLeft(null, NOW)).toBeNull();
  });
});

describe("getElapsedDays", () => {
  it("보는 사람 날짜 기준으로 접수 후 며칠째인지 센다", () => {
    expect(getElapsedDays(new Date(2026, 8, 16, 0, 30).toISOString(), NOW)).toBe(0);
    expect(getElapsedDays(new Date(2026, 8, 13, 23, 0).toISOString(), NOW)).toBe(3);
  });
});
