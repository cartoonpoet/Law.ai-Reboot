import type { ContractResponse } from "@lawai/contracts";
import {
  contractRequestDefaults,
  type ContractRequestForm,
} from "./request-schema";

const dateOnly = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");

// 계약 단건 응답(ContractResponse) → 폼 기본값(ContractRequestForm). toCreateRequest 의 역변환.
export const toEditDefaults = (c: ContractResponse): ContractRequestForm => {
  const d = c.details;
  const filesByRole = (role: "contract" | "attach" | "ref") =>
    c.files
      .filter((f) => f.role === role)
      .map((f) => ({
        id: f.id,
        name: f.name,
        meta: f.meta ?? "",
        mimeType: f.mimeType,
      }));
  const refsBy = (ccType: "user" | "dept", isSecret: boolean) =>
    c.references
      .filter((r) => r.ccType === ccType && r.isSecret === isSecret)
      .map((r) => ({ id: r.refId, name: r.name }));

  return {
    ...contractRequestDefaults,
    // ① 개요
    stage: d.stage,
    secure: c.securityLevel,
    name: c.title,
    requester: c.requesterId ?? "",
    ctype: c.reviewType,
    party: c.party ?? "",
    categoryId: c.categoryId ?? "",
    periodStart: dateOnly(c.periodStart),
    periodEnd: dateOnly(c.periodEnd),
    periodText: d.periodText,
    periodManual: d.periodManual,
    noEndDate: d.noEndDate,
    counterparties: c.counterparties.map((cp) => cp.snapshot),
    // ② 계약서·첨부
    contractFiles: filesByRole("contract"),
    attachFiles: filesByRole("attach"),
    refFiles: filesByRole("ref"),
    // ③ 관계자·참조
    ccUsers: refsBy("user", false),
    ccDepts: refsBy("dept", false),
    ccSecret: refsBy("user", true),
    owner: d.owner,
    project: d.project,
    relatedDocs: d.relatedDocs,
    // ④ 상세 조건
    lang: d.lang,
    legal: d.legal,
    expectedDate: dateOnly(c.dueDate),
    negotiation: d.negotiation,
    money: d.money.length > 0 ? d.money : contractRequestDefaults.money,
    moneyNote: d.moneyNote,
    // ⑤ 상세 내용
    payTerms: d.payTerms,
    purpose: d.purpose,
    keyPoints: d.keyPoints,
    concerns: d.concerns,
    urls: d.urls.map((value) => ({ value })),
    // 결재선: 상신 전(plannedApprovers)을 우선하고, 없으면 활성 라인 스텝으로 폴백.
    approvers:
      c.plannedApprovers.length > 0
        ? c.plannedApprovers.map((a) => ({
            userId: a.userId ?? null,
            name: a.name,
            dept: a.dept,
            type: a.type,
          }))
        : c.approvalLine?.steps.map((s) => ({
            userId: s.userId,
            name: s.name,
            dept: s.dept,
            type: s.type,
          })) ?? [],
  };
};
