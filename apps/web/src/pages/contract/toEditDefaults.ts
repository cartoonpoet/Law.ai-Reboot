import type { ContractResponse } from "@lawai/contracts";
import {
  contractRequestDefaults,
  type ContractRequestForm,
} from "./request-schema";

const dateOnly = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");

// 계약 단건 응답(ContractResponse) → 폼 기본값(ContractRequestForm). toCreateRequest 의 역변환.
export const toEditDefaults = (c: ContractResponse): ContractRequestForm => {
  const d = c.details;
  const filesByRole = (role: "contract" | "attach" | "ref" | "signed") =>
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

  // registerAs 는 DB 컬럼이 아니라 create() 시점 입력일 뿐이라 응답에 그대로 없다(계약이
  // signed 로 확정된 뒤엔 "체결 완료 등록으로 시작했는지" 자체가 더는 구분해서 저장되지
  // 않는다 — 서버 create() 주석 참고). 그래서 여기선 role=signed 파일 존재 여부로 역산한다:
  // 체결 완료 등록(및 completeSigning 으로 승격된 검토 계약)은 signed 파일이 있고, 순수
  // 검토 계약은 없다. finalizeRegistration 확정 *전*(아직 unassigned, signedAt 미저장)에
  // 편집을 다시 열면 signedAt 은 비어 보인다 — 그 값은 finalize 시점에만 저장되기 때문.
  const isSigned = c.files.some((f) => f.role === "signed");

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
    // 등록 유형 — role=signed 파일 존재로 역산(위 주석 참고).
    registerAs: isSigned ? "signed" : "review",
    signedAt: dateOnly(c.signedAt),
    // ② 계약서·첨부
    contractFiles: filesByRole("contract"),
    attachFiles: filesByRole("attach"),
    refFiles: filesByRole("ref"),
    signedFiles: filesByRole("signed"),
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
