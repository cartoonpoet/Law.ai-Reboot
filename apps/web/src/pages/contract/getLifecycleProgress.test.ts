import { describe, it, expect } from "vitest";
import type { ApprovalLineResponse, ApprovalStepResponse } from "@lawai/contracts";
import { getLifecycleProgress, getStepRelation } from "./getLifecycleProgress";
import type { LifecycleProgressInput } from "./getLifecycleProgress";

const NOW = new Date("2026-09-13T00:00:00Z");

const baseInput: LifecycleProgressInput = {
  status: "draft",
  ownerName: null,
  dueDate: null,
  signedAt: null,
  period: "2026-10-01 ~ 2028-09-30",
  approvalLine: null,
  now: NOW,
};

const step = (type: ApprovalStepResponse["type"], status: ApprovalStepResponse["status"]): ApprovalStepResponse => ({
  id: `${type}-${status}-${Math.random()}`,
  stepOrder: 0,
  avatarUrl: null,
  userId: null,
  name: "홍길동",
  dept: "법무팀",
  type,
  status,
  comment: null,
  decidedAt: null,
});

const line = (steps: ApprovalStepResponse[]): ApprovalLineResponse => ({
  id: "line-1",
  status: "pending",
  steps,
  currentStepId: null,
  submittedById: "u1",
  submittedAt: "2026-09-10T00:00:00Z",
});

describe("getLifecycleProgress", () => {
  it("status 를 10단계 인덱스와 done/current/todo 로 매핑한다", () => {
    const p = getLifecycleProgress({ ...baseInput, status: "legalReview", ownerName: "김법무" });
    expect(p.currentIndex).toBe(3);
    expect(p.steps).toHaveLength(10);
    expect(p.steps.slice(0, 3).every((s) => s.state === "done")).toBe(true);
    expect(p.steps[3]).toEqual({ label: "법무 검토", phase: "검토", state: "current" });
    expect(p.steps.slice(4).every((s) => s.state === "todo")).toBe(true);
    expect(p.percent).toBe(30);
  });

  it("체결 진행은 결재(approve/agree) 승인 비율만큼 단계 안에서 더 찬다 — 기안·참조는 제외", () => {
    const p = getLifecycleProgress({
      ...baseInput,
      status: "signing",
      approvalLine: line([step("draft", "approved"), step("approve", "approved"), step("agree", "pending"), step("refer", "pending")]),
    });
    expect(p.percent).toBe(65);
    expect(p.note).toBe("결재 1/2 승인 · 결재 진행 중");
  });

  it("결재가 모두 승인되면 인감담당 체결 처리 대기 문구", () => {
    const p = getLifecycleProgress({ ...baseInput, status: "signing", approvalLine: line([step("approve", "approved")]) });
    expect(p.note).toBe("결재 완료 · 인감담당 체결 처리 대기");
    expect(p.percent).toBe(70);
  });

  it("계약 종료는 100%", () => {
    expect(getLifecycleProgress({ ...baseInput, status: "closed" }).percent).toBe(100);
  });

  it("검토 단계는 담당자와 검토기한 D-day 를 문구에 붙인다(지남·당일 포함)", () => {
    expect(getLifecycleProgress({ ...baseInput, status: "legalReview", ownerName: "김법무", dueDate: "2026-09-18T00:00:00Z" }).note).toBe(
      "김법무 검토 중 · 검토기한 D-5",
    );
    expect(getLifecycleProgress({ ...baseInput, status: "unassigned", dueDate: "2026-09-13T00:00:00Z" }).note).toBe(
      "법무팀 배정 대기 · 검토기한 D-day",
    );
    expect(getLifecycleProgress({ ...baseInput, status: "requesterReview", dueDate: "2026-09-11T00:00:00Z" }).note).toBe(
      "요청자 확인 대기 · 검토기한 D+2 경과",
    );
    expect(getLifecycleProgress({ ...baseInput, status: "legalReview" }).note).toBe("법무 담당자 검토 중");
  });

  it("체결 완료는 체결일, 계약 이행은 계약 기간을 보여준다", () => {
    expect(getLifecycleProgress({ ...baseInput, status: "signed", signedAt: "2026-09-20T00:00:00.000Z" }).note).toBe("체결일 2026-09-20");
    expect(getLifecycleProgress({ ...baseInput, status: "fulfilling" }).note).toBe("계약 기간 2026-10-01 ~ 2028-09-30");
  });
});

describe("getStepRelation", () => {
  it("현재 기준 몇 단계 전·뒤인지, 바로 다음 단계인지 알려준다", () => {
    const p = getLifecycleProgress({ ...baseInput, status: "signing" });
    expect(getStepRelation(4, p)).toBe("완료 · 2단계 전");
    expect(getStepRelation(6, p)).toBe(`지금 · ${p.note}`);
    expect(getStepRelation(7, p)).toBe("다음 단계");
    expect(getStepRelation(9, p)).toBe("예정 · 3단계 뒤");
  });
});
