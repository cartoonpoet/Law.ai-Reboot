import { describe, it, expect } from "vitest";
import type { ContractCan } from "@lawai/contracts";
import { getActionView } from "./getActionView";

const CAN_NONE: ContractCan = { edit: false, assign: false, transition: false, delete: false };
const CAN_ALL: ContractCan = { edit: true, assign: true, transition: true, delete: true };

describe("getActionView", () => {
  it("reviewDone + 요청자 본인: 상신 모드, canSubmit=false 면 버튼 disabled", () => {
    const view = getActionView("reviewDone", CAN_NONE, {
      isRequester: true,
      isMyTurn: false,
      canSubmit: false,
    });
    expect(view.isSubmitMode).toBe(true);
    expect(view.head).toBe("체결 품의");
    expect(view.buttons).toHaveLength(1);
    expect(view.buttons[0]).toMatchObject({ kind: "submitApproval", disabled: true });
  });

  it("reviewDone + 요청자 본인 + canSubmit=true: 버튼 활성", () => {
    const view = getActionView("reviewDone", CAN_NONE, {
      isRequester: true,
      isMyTurn: false,
      canSubmit: true,
    });
    expect(view.buttons[0].disabled).toBe(false);
  });

  it("reviewDone + 비요청자: 상신 모드 아님(기존 검토 단계 분기로)", () => {
    const view = getActionView("reviewDone", CAN_ALL, {
      isRequester: false,
      isMyTurn: false,
      canSubmit: false,
    });
    expect(view.isSubmitMode).toBe(false);
    expect(view.head).toBe("검토 액션");
  });

  it("signing + 내 차례: 결재 처리 모드(의견+승인/반려)", () => {
    const view = getActionView("signing", CAN_NONE, {
      isRequester: false,
      isMyTurn: true,
      canSubmit: false,
    });
    expect(view.isDecideMode).toBe(true);
    expect(view.isApprovalMode).toBe(true);
    expect(view.buttons.map((b) => b.kind)).toEqual(["rejectStep", "approveStep"]);
  });

  it("signing + 내 차례 아님: 읽기 전용 결재 현황(버튼 없음)", () => {
    const view = getActionView("signing", CAN_NONE, {
      isRequester: false,
      isMyTurn: false,
      canSubmit: false,
    });
    expect(view.isDecideMode).toBe(false);
    expect(view.buttons).toHaveLength(0);
    expect(view.notice).toBe("체결 품의 결재가 진행 중입니다.");
  });

  it("signed: 읽기 전용 결재 현황", () => {
    const view = getActionView("signed", CAN_NONE);
    expect(view.isApprovalMode).toBe(true);
    expect(view.isDecideMode).toBe(false);
    expect(view.notice).toBe("모든 결재가 완료되었습니다. (읽기 전용)");
  });

  it("legalReview + can.transition: 반려/검토완료 버튼(기존 동작 유지)", () => {
    const view = getActionView("legalReview", CAN_ALL);
    expect(view.buttons.map((b) => b.kind)).toEqual(["reject", "reviewDone", "assign"]);
  });

  it("unassigned: 담당자 배정 안내(기존 동작 유지)", () => {
    const view = getActionView("unassigned", CAN_ALL);
    expect(view.showAssignee).toBe(false);
    expect(view.notice).toBe("법무팀 담당자 배정이 필요합니다.");
  });

  it("approval 인자 생략 시 기본값(비요청자·내 차례 아님)으로 동작한다", () => {
    const view = getActionView("reviewDone", CAN_NONE);
    expect(view.isSubmitMode).toBe(false);
  });
});
