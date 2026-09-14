import { describe, expect, it } from "vitest";
import { buildPipeline, PIPELINE_STATUSES } from "./buildPipeline";

describe("buildPipeline", () => {
  it("진행 중 계약 단계를 순서대로 만들고 없는 건수는 0", () => {
    const stages = buildPipeline({ legalReview: 3 });
    expect(stages.map((s) => s.status)).toEqual(PIPELINE_STATUSES);
    expect(stages.find((s) => s.status === "legalReview")?.count).toBe(3);
    expect(stages.find((s) => s.status === "signing")?.count).toBe(0);
  });

  it("처리 대기 단계 중 가장 많은 단계 하나만 표시한다(동률이면 앞 단계)", () => {
    const stages = buildPipeline({ unassigned: 4, legalReview: 4, reviewDone: 9 });
    expect(stages.filter((s) => s.isBusiest).map((s) => s.status)).toEqual(["unassigned"]);
    expect(stages.find((s) => s.status === "unassigned")?.tone).toBe("danger");
  });

  it("검토 완료는 가장 많아도 쌓임 표시를 하지 않는다", () => {
    const stages = buildPipeline({ reviewDone: 9 });
    expect(stages.some((s) => s.isBusiest)).toBe(false);
    expect(stages.find((s) => s.status === "reviewDone")?.tone).toBe("success");
  });
});
