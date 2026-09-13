import type { CreateContractInput } from "../../api/contracts";
import type { ContractRequestForm } from "./request-schema";

// 폼(ContractRequestForm) → 계약 생성 요청(CreateContractInput) 매핑.
// 코어 컬럼은 펼치고, 그 외 폼 필드는 details(JSONB)로, 상대계약자는 스냅샷으로 동결한다.
export const toCreateRequest = (
  form: ContractRequestForm,
): CreateContractInput => ({
  title: form.name,
  securityLevel: form.secure,
  reviewType: form.ctype,
  party: form.party || null,
  categoryId: form.categoryId || null,
  requesterId: form.requester || null,
  // ownerId(법무 담당자)는 보내지 않는다. 폼의 업무담당자(form.owner)는 details.owner 에만 담는다 —
  // ownerId 는 AssignModal/상태 엔드포인트로만 배정되고, AI 트리거·알림·"내 담당" 큐와
  // 미배정 생성자 권한(canEditUnassigned)·finalizeRegistration 게이트가 이 값에 걸려 있다.
  periodStart: form.periodStart || null,
  periodEnd: form.periodEnd || null,
  dueDate: form.expectedDate || null,
  schemaVersion: 1,
  registerAs: form.registerAs,
  signedAt: form.signedAt || null,
  details: {
    stage: form.stage,
    periodText: form.periodText,
    periodManual: form.periodManual,
    noEndDate: form.noEndDate,
    lang: form.lang,
    legal: form.legal,
    negotiation: form.negotiation,
    money: form.money,
    moneyNote: form.moneyNote,
    payTerms: form.payTerms,
    purpose: form.purpose,
    keyPoints: form.keyPoints,
    concerns: form.concerns,
    urls: form.urls.map((u) => u.value),
    owner: form.owner,
    project: form.project,
    relatedDocs: form.relatedDocs,
  },
  counterparties: form.counterparties.map((company) => ({
    companyId: company.id,
    snapshot: company,
  })),
  approvers: form.approvers,
  files: [
    ...form.contractFiles.map((f, i) => ({
      // id 가 있으면(편집/업로드 완료) 서버가 update 모드로 처리 — R2 객체 보존.
      ...(f.id ? { id: f.id } : {}),
      role: "contract" as const,
      name: f.name,
      meta: f.meta,
      sortOrder: i,
    })),
    ...form.attachFiles.map((f, i) => ({
      ...(f.id ? { id: f.id } : {}),
      role: "attach" as const,
      name: f.name,
      meta: f.meta,
      sortOrder: i,
    })),
    ...form.refFiles.map((f, i) => ({
      ...(f.id ? { id: f.id } : {}),
      role: "ref" as const,
      name: f.name,
      meta: f.meta,
      sortOrder: i,
    })),
    ...form.signedFiles.map((f, i) => ({
      ...(f.id ? { id: f.id } : {}),
      role: "signed" as const,
      name: f.name,
      meta: f.meta,
      sortOrder: i,
    })),
  ],
  references: [
    ...form.ccUsers.map((u) => ({ ccType: "user" as const, isSecret: false, refId: u.id, name: u.name })),
    ...form.ccDepts.map((d) => ({ ccType: "dept" as const, isSecret: false, refId: d.id, name: d.name })),
    ...form.ccSecret.map((u) => ({ ccType: "user" as const, isSecret: true, refId: u.id, name: u.name })),
  ],
});
