import { CATEGORY_LABEL_SEPARATOR } from "@lawai/contracts";
import type {
  ContractResponse,
  FileRole,
  MoneyRow,
  ApprovalStepResponse,
  StepStatus,
  ApproverType,
} from "@lawai/contracts";
import type {
  ContractDetail,
  ApprovalStepView,
  RelatedDocView,
  CcRecipientView,
} from "./mock-data";
import { getStatusLabel } from "./contractStatus";

const LANG_LABEL: Record<string, string> = {
  ko: "국문",
  en: "영문",
  koen: "국영문",
  etc: "기타",
};

const LEGAL_LABEL: Record<string, string> = {
  dom: "국내 법무",
  intl: "해외 법무",
  "": "-",
};

const FILE_KIND: Record<FileRole, string> = {
  contract: "계약서",
  attach: "첨부",
  ref: "참고",
  signed: "서명본",
};

// 결재 유형 라벨(시안 결재선 칩: 기안/합의/결재/참조).
const APPROVER_TYPE_LABEL: Record<ApproverType, string> = {
  draft: "기안",
  approve: "결재",
  agree: "합의",
  refer: "참조",
};

// 결재 단계 상태 라벨(시안 apvstat: 완료/반려/진행중/대기).
const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  approved: "완료",
  rejected: "반려",
  pending: "대기",
};

const fmtMoney = (amount: number | null, currency: string): string =>
  amount == null ? "-" : `${amount.toLocaleString()} ${currency}`;

const fmtPeriod = (
  start: string | null,
  end: string | null,
  text: string,
  noEndDate: boolean,
): string => {
  if (start && noEndDate) return `${start.slice(0, 10)} ~ (종료일 없음)`;
  if (start || end) return `${start?.slice(0, 10) ?? ""} ~ ${end?.slice(0, 10) ?? ""}`;
  return text || "-";
};

// 빈 문자열 → null(표시단에서 빈값 뱃지). 공백만 있는 값도 빈값 취급.
const blankToNull = (s: string | null | undefined): string | null => {
  const v = s?.trim();
  return v ? v : null;
};

/**
 * money[] 에서 시안 3칩(계약금액[부가세별도]/세액/실지급액)을 파생한다.
 * - 계약금액: 모든 row 의 amount 합(통화 동일 가정, 첫 row 통화 사용).
 * - 세액: vat 정책별 — included(내재 1/11) / excluded(10% 별도) / none(0). 합산.
 * - 실지급액: 계약금액 + 세액(다만 included 인 경우 amount 에 이미 포함되므로 가산하지 않음).
 * 모든 row 가 amount==null 이면 전부 "-".
 */
const deriveAmounts = (
  money: MoneyRow[],
): { contract: string; vat: string; total: string } => {
  const rows = money.filter((m) => m.amount != null);
  if (rows.length === 0) return { contract: "-", vat: "-", total: "-" };
  const currency = rows[0]?.currency ?? "KRW";
  let contractSum = 0; // 표기 계약금액(부가세 별도 기준 본체)
  let vatSum = 0;
  let totalSum = 0; // 실 지급액
  for (const m of rows) {
    const amount = m.amount ?? 0;
    if (m.vat === "included") {
      // amount 에 부가세 포함 → 본체 = round(amount/1.1), 세액 = amount - 본체(반올림 잔차).
      const base = Math.round(amount / 1.1);
      contractSum += base;
      vatSum += amount - base;
      totalSum += amount;
    } else if (m.vat === "excluded") {
      const vat = Math.round(amount * 0.1);
      contractSum += amount;
      vatSum += vat;
      totalSum += amount + vat;
    } else {
      // none: 면세/비과세
      contractSum += amount;
      totalSum += amount;
    }
  }
  return {
    contract: fmtMoney(contractSum, currency),
    vat: vatSum > 0 ? fmtMoney(vatSum, currency) : "-",
    total: fmtMoney(totalSum, currency),
  };
};

// pending 스텝 중 currentStepId 와 일치하는 것만 "now"(내 차례 진행 표시), 그 외 pending 은 "wait".
const toStepStatusKind = (
  s: ApprovalStepResponse,
  currentStepId: string | null,
): ApprovalStepView["statusKind"] => {
  if (s.status === "approved") return "done";
  if (s.status === "rejected") return "rejected";
  return s.id === currentStepId ? "now" : "wait";
};

const toApprovalStep = (
  s: ApprovalStepResponse,
  currentStepId: string | null,
): ApprovalStepView => ({
  id: s.id,
  order: s.stepOrder,
  userId: s.userId,
  name: s.name,
  dept: s.dept,
  type: APPROVER_TYPE_LABEL[s.type] ?? s.type,
  typeKind: s.type,
  status: STEP_STATUS_LABEL[s.status] ?? s.status,
  statusKind: toStepStatusKind(s, currentStepId),
  comment: s.comment,
  decidedAt: s.decidedAt,
});

// 계약 단건 응답(ContractResponse) → 상세 화면 뷰모델(ContractDetail).
// 코멘트는 별도 조회(useComments)로 분리됨 — detailView 에 포함하지 않는다.
// AI 리스크·라이프사이클은 아직 별도 기능이라 매핑 대상 아님(상세 페이지가 mock 유지).
export const toDetailView = (c: ContractResponse): ContractDetail => {
  const d = c.details;
  const labelParts = c.categoryLabel
    ? c.categoryLabel.split(CATEGORY_LABEL_SEPARATOR)
    : [];
  const catPath = [c.party, ...labelParts].filter(
    (x): x is string => Boolean(x),
  );
  const snapshot = c.counterparties[0]?.snapshot;
  const ccUser: CcRecipientView[] = c.references
    .filter((r) => r.ccType === "user" && !r.isSecret)
    .map((r) => ({ id: r.id, name: r.name, isSecret: false }));
  const ccSecret: CcRecipientView[] = c.references
    .filter((r) => r.isSecret)
    .map((r) => ({ id: r.id, name: r.name, isSecret: true }));
  const relatedDocs: RelatedDocView[] = d.relatedDocs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    sub: doc.sub,
    date: doc.date,
  }));
  return {
    id: c.code,
    name: c.title,
    status: getStatusLabel(c.status),
    secure: c.securityLevel !== "normal",
    stage: d.stage === "new" ? "신규계약" : "변경·해지",
    requester: c.requesterName ?? c.requesterId ?? "-",
    owner: c.ownerName ?? c.ownerId ?? "미배정",
    catPath,
    period: fmtPeriod(c.periodStart, c.periodEnd, d.periodText, d.noEndDate),
    type: c.reviewType === "std" ? "표준계약서 계약체결" : "일반 검토요청",
    files: c.files.map((f) => ({
      id: f.id,
      name: f.name,
      meta: f.meta ?? "",
      kind: FILE_KIND[f.role],
      mimeType: f.mimeType,
      // R2 backing 이 있는 파일만 미리보기/비교 활성. 메타데이터-only 레거시는 false.
      hasStorage: Boolean(f.storageKey),
    })),
    ccDept: c.references.filter((r) => r.ccType === "dept").map((r) => r.name),
    counter: snapshot?.name ?? "-",
    lang: LANG_LABEL[d.lang] ?? d.lang,
    legalCat: LEGAL_LABEL[d.legal] ?? "-",
    negotiation: d.negotiation,
    amount: deriveAmounts(d.money),
    payTerms: d.payTerms,
    purpose: d.purpose,
    notes: d.concerns,
    // --- detail v3 확장 ---
    createdAt: c.createdAt ?? null,
    dueDate: c.dueDate ?? null,
    moneyNote: blankToNull(d.moneyNote),
    keyPoints: blankToNull(d.keyPoints),
    urls: d.urls ?? [],
    project: d.project ? { id: d.project.id, name: d.project.name } : null,
    relatedDocs,
    detailsOwner: d.owner ? { id: d.owner.id, name: d.owner.name } : null,
    counterpartyBizNo: blankToNull(snapshot?.bizNo),
    counterpartyRep: blankToNull(snapshot?.ceo),
    ccUser,
    ccSecret,
    approvalLine: c.approvalLine
      ? c.approvalLine.steps.map((s) => toApprovalStep(s, c.approvalLine!.currentStepId))
      : null,
  };
};
