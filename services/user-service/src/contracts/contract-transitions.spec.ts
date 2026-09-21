import {
  ALLOWED_TRANSITIONS,
  ORIGIN_CLOSE_BY_STAGE,
  POST_SIGN_STATUSES,
  TERMINABLE_STATUSES,
  TERMINATION_REASON_LABEL,
  VALID_STATUSES,
} from "./contract-transitions";

describe("contract-transitions", () => {
  it("전이 맵의 모든 도착 상태는 유효한 상태다", () => {
    Object.values(ALLOWED_TRANSITIONS).flat().forEach((to) => expect(VALID_STATUSES.has(to)).toBe(true));
  });
  it("signing 진입(reviewDone→signing)은 맵에 없다 — submitApproval 전용", () => {
    expect(ALLOWED_TRANSITIONS.reviewDone).not.toContain("signing");
  });
  it("closed 는 종착이고 체결 이후 상태는 해지 가능 상태를 포함한다", () => {
    expect(ALLOWED_TRANSITIONS.closed).toEqual([]);
    TERMINABLE_STATUSES.forEach((s) => expect(POST_SIGN_STATUSES).toContain(s));
  });
  it("갱신·해지만 원 계약을 닫고, 해지 사유 라벨은 4종", () => {
    expect(Object.keys(ORIGIN_CLOSE_BY_STAGE).sort()).toEqual(["renew", "terminate"]);
    expect(Object.keys(TERMINATION_REASON_LABEL)).toHaveLength(4);
  });
});
