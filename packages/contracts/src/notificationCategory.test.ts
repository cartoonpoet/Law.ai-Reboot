import { describe, expect, it } from "vitest";
import { getNotificationAdviceId, getNotificationCategory, getNotificationContractId } from "./dto/notification.dto";

describe("getNotificationAdviceId", () => {
  it("자문 진행 알림(배정·질의·회신·종결)은 detail.adviceId", () => {
    expect(getNotificationAdviceId({ adviceId: "a-9", code: "ADV-2026-0091", title: "준거법 문의" })).toBe("a-9");
  });

  it("자문 요청·회신 결재 알림은 detail.targetId", () => {
    expect(getNotificationAdviceId({ targetType: "advice_request", targetId: "a-1" })).toBe("a-1");
    expect(getNotificationAdviceId({ targetType: "advice_answer", targetId: "a-2" })).toBe("a-2");
  });

  it("자문 알림이 아니면 null", () => {
    expect(getNotificationAdviceId({ targetType: "contract", targetId: "k-1" })).toBeNull();
    expect(getNotificationAdviceId(null)).toBeNull();
  });
});

describe("getNotificationContractId", () => {
  it("코멘트 알림은 detail.contractId", () => {
    expect(getNotificationContractId({ contractId: "k-1", preview: "본문" })).toBe("k-1");
  });

  it("결재 알림은 대상이 계약일 때 detail.targetId", () => {
    expect(getNotificationContractId({ targetType: "contract", targetId: "k-2", title: "품의" })).toBe("k-2");
    expect(getNotificationContractId({ targetType: "advice", targetId: "a-1" })).toBeNull();
  });

  it("가리키는 계약이 없으면 null", () => {
    expect(getNotificationContractId(null)).toBeNull();
    expect(getNotificationContractId({ contractId: 3 })).toBeNull();
  });
});

describe("getNotificationCategory", () => {
  it("결재 알림(차례·참조·반려·완료)은 결재 묶음", () => {
    for (const type of ["approval_turn", "approval_referred", "approval_rejected", "approval_completed"]) {
      expect(getNotificationCategory(type)).toBe("approval");
    }
  });

  it("코멘트 알림(언급)은 코멘트 묶음", () => {
    expect(getNotificationCategory("comment_mention")).toBe("comment");
  });

  it("계약 만료 임박 알림은 계약 묶음", () => {
    for (const type of ["contract_expiring_90", "contract_expiring_30", "contract_expiring_7"]) {
      expect(getNotificationCategory(type)).toBe("contract");
    }
  });

  it("어느 묶음에도 없는 알림은 null(항상 받음)", () => {
    expect(getNotificationCategory("system_notice")).toBeNull();
  });
});
