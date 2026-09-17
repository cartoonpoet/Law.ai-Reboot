import { describe, it, expect } from "vitest";
import type { ApprovalInboxItem } from "@lawai/contracts";
import { toInboxRow } from "./toInboxRow";

const NOW = new Date(2026, 8, 12, 15);

const item: ApprovalInboxItem = {
  lineId: "L1",
  targetType: "contract",
  targetId: "C1",
  targetCode: "C20260908-0142",
  isTargetDeleted: false,
  title: "클라우드 서비스 이용계약",
  submittedById: "u1",
  submittedByName: "한지원",
  submittedByDept: "사업개발팀",
  myStepOrder: 1,
  totalSteps: 3,
  myType: "approve",
  submittedAt: new Date(2026, 8, 11, 10).toISOString(),
  lineStatus: "pending",
  myStatus: "pending",
  myDecidedAt: null,
};

describe("toInboxRow", () => {
  it("계약 대상은 계약 상세 경로로 딥링크한다", () => {
    expect(toInboxRow(item, NOW).href).toBe("/contract/C1");
  });

  it("자문 요청·회신 결재는 자문 상세로 딥링크하고 문서 종류를 구분한다", () => {
    const request = toInboxRow({ ...item, targetType: "advice_request", targetId: "A1" }, NOW);
    const answer = toInboxRow({ ...item, targetType: "advice_answer", targetId: "A1" }, NOW);
    expect([request.href, request.kindLabel]).toEqual(["/advice/A1", "자문 요청"]);
    expect([answer.href, answer.kindLabel]).toEqual(["/advice/A1", "자문 회신"]);
  });

  it("내 단계는 1-based 번호와 전체 단계 수", () => {
    const row = toInboxRow(item, NOW);
    expect([row.stepNumber, row.totalSteps]).toEqual([2, 3]);
  });

  it("결재 유형 배지는 문서 종류(체결 품의), 역할은 따로(결재/합의)", () => {
    expect(toInboxRow(item, NOW).kindLabel).toBe("체결 품의");
    expect(toInboxRow(item, NOW).roleLabel).toBe("결재");
    expect(toInboxRow({ ...item, myType: "agree" }, NOW)).toMatchObject({ roleLabel: "합의", isAgree: true });
  });

  it("문서 아래 줄은 관리번호 · 계약, 번호가 없으면 업무 이름만", () => {
    expect(toInboxRow(item, NOW).docMeta).toBe("C20260908-0142 · 계약");
    expect(toInboxRow({ ...item, targetCode: null }, NOW).docMeta).toBe("계약");
  });

  it("대상 계약이 삭제됐으면 보조 줄에 삭제됨을 붙이고 이동 경로를 없앤다", () => {
    const row = toInboxRow({ ...item, isTargetDeleted: true }, NOW);
    expect(row.docMeta).toBe("C20260908-0142 · 계약 · 삭제됨");
    expect(row.href).toBeNull();
  });

  it("경과는 당일 오늘, 지난 날은 D+n 경고", () => {
    expect(toInboxRow(item, NOW)).toMatchObject({ elapsedLabel: "D+1", elapsedTone: "overdue" });
    expect(toInboxRow({ ...item, submittedAt: new Date(2026, 8, 12, 9).toISOString() }, NOW)).toMatchObject({
      elapsedLabel: "오늘",
      elapsedTone: "today",
    });
  });

  it("계약 결재는 결재 브리핑 AI 분석을 붙일 대상으로, 다른 도메인은 없음", () => {
    expect(toInboxRow(item, NOW).aiTarget).toEqual({ contractId: "C1", kind: "approvalBriefing" });
    expect(toInboxRow({ ...item, targetType: "advice" }, NOW).aiTarget).toBeNull();
  });

  it("상신일은 MM-DD 로 표기한다", () => {
    expect(toInboxRow({ ...item, submittedAt: "2026-09-11T01:00:00.000Z" }, NOW).submittedAtLabel).toBe("09-11");
  });

  it("처리 결과 라벨: approved→승인, rejected→반려, pending→대기", () => {
    expect(toInboxRow({ ...item, myStatus: "approved" }, NOW).myStatusLabel).toBe("승인");
    expect(toInboxRow({ ...item, myStatus: "rejected" }, NOW).myStatusLabel).toBe("반려");
    expect(toInboxRow(item, NOW).myStatusLabel).toBe("대기");
  });
});
