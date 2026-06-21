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
  catMajor: form.catMajor || null,
  catMinor: form.catMinor || null,
  catSub: form.catSub || null,
  requesterId: form.requester || null,
  ownerId: form.owner?.id ?? null,
  periodStart: form.periodStart || null,
  periodEnd: form.periodEnd || null,
  dueDate: form.expectedDate || null,
  schemaVersion: 1,
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
    ccUsers: form.ccUsers,
    ccDepts: form.ccDepts,
    ccSecret: form.ccSecret,
    owner: form.owner,
    project: form.project,
    relatedDocs: form.relatedDocs,
    contractFiles: form.contractFiles,
    attachFiles: form.attachFiles,
    refFiles: form.refFiles,
  },
  counterparties: form.counterparties.map((company) => ({
    companyId: company.id,
    snapshot: company,
  })),
  approvers: form.approvers,
});
