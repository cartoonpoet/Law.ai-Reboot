import { describe, it, expect } from "vitest";
import type { ApprovalInboxItem } from "@lawai/contracts";
import { toInboxRow } from "./toInboxRow";

const item: ApprovalInboxItem = {
  lineId: "L1",
  targetType: "contract",
  targetId: "C1",
  title: "클라우드 서비스 이용계약",
  submittedById: "u1",
  submittedByName: "한지원",
  submittedByDept: "사업개발팀",
  myStepOrder: 1,
  totalSteps: 3,
  myType: "approve",
  submittedAt: "2026-09-11T01:00:00.000Z",
  lineStatus: "pending",
  myStatus: "pending",
  myDecidedAt: null,
};

describe("toInboxRow", () => {
  it("계약 대상은 계약 상세 경로로 딥링크한다", () => {
    expect(toInboxRow(item).href).toBe("/contract/C1");
  });

  it("내 단계는 1-based n/m 로 표기한다", () => {
    expect(toInboxRow(item).stepLabel).toBe("2/3");
  });

  it("유형 라벨: approve→결재, agree→합의", () => {
    expect(toInboxRow(item).typeLabel).toBe("결재");
    expect(toInboxRow({ ...item, myType: "agree" }).typeLabel).toBe("합의");
  });

  it("결재 유형 라벨: contract → 체결 품의", () => {
    expect(toInboxRow(item).kindLabel).toBe("체결 품의");
  });

  it("상신일은 MM-DD 로 표기한다", () => {
    expect(toInboxRow(item).submittedAtLabel).toBe("09-11");
  });

  it("처리 결과 라벨: approved→승인, rejected→반려, pending→대기", () => {
    expect(toInboxRow({ ...item, myStatus: "approved" }).myStatusLabel).toBe("승인");
    expect(toInboxRow({ ...item, myStatus: "rejected" }).myStatusLabel).toBe("반려");
    expect(toInboxRow(item).myStatusLabel).toBe("대기");
  });
});
