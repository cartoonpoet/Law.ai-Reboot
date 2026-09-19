import { getDefaultRange, getStageLabel, getStageTargetDays, getTargetConfig, roundDays } from "./cycle-time.config";

describe("cycle-time.config", () => {
  it("계약과 자문의 단계가 서로 다르다", () => {
    expect(getTargetConfig("contract").stages.map((s) => s.status)).toContain("signing");
    expect(getTargetConfig("advice").stages.map((s) => s.status)).toContain("answerApproval");
  });

  it("끝났다고 보는 상태에 이행·종결이 들어간다", () => {
    expect(getTargetConfig("contract").doneStatuses).toEqual(["signed", "fulfilling", "closed"]);
    expect(getTargetConfig("advice").doneStatuses).toEqual(["answered", "closed"]);
  });

  it("상태 이름을 한국어 라벨로 바꾼다", () => {
    expect(getStageLabel("contract", "legalReview")).toBe("법무 검토");
    expect(getStageLabel("advice", "waitingRequester")).toBe("요청자 답변 대기");
  });

  it("모르는 상태는 상태 값을 그대로 쓰고 목표일은 없다", () => {
    expect(getStageLabel("contract", "somethingElse")).toBe("somethingElse");
    expect(getStageTargetDays("contract", "somethingElse")).toBeNull();
  });

  it("기간을 안 주면 그달 1일부터 6개월치를 본다", () => {
    expect(getDefaultRange(new Date("2026-09-19T05:00:00.000Z"))).toEqual({
      from: "2026-04-01",
      to: "2026-09-19",
    });
  });

  it("해가 바뀌는 구간도 제대로 센다", () => {
    expect(getDefaultRange(new Date("2026-02-10T00:00:00.000Z")).from).toBe("2025-09-01");
  });

  // 한국 시간 기준 — UTC 로 재면 오전 9시 이전에 하루가, 1일 오전에 한 달이 밀린다.
  it("한국 시간 새벽에도 오늘까지로 잡는다", () => {
    expect(getDefaultRange(new Date("2026-09-18T15:30:00.000Z")).to).toBe("2026-09-19");
  });

  it("한국 시간으로 1일 오전이면 그달까지 센다", () => {
    expect(getDefaultRange(new Date("2026-08-31T23:00:00.000Z"))).toEqual({
      from: "2026-04-01",
      to: "2026-09-01",
    });
  });

  it("일수는 소수 첫째 자리까지, 값이 없으면 null 그대로", () => {
    expect(roundDays(3.14159)).toBe(3.1);
    expect(roundDays(null)).toBeNull();
    expect(roundDays(Number.NaN)).toBeNull();
  });
});
