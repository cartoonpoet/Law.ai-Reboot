import { CATEGORY_LABEL_SEPARATOR } from "@lawai/contracts";
import type { ContractResponse, FileRole } from "@lawai/contracts";
import type { ContractDetail } from "./mock-data";
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
};

const fmtMoney = (amount: number | null, currency: string): string =>
  amount == null ? "-" : `${amount.toLocaleString()} ${currency}`;

const fmtPeriod = (start: string | null, end: string | null, text: string): string => {
  if (start || end) return `${start?.slice(0, 10) ?? ""} ~ ${end?.slice(0, 10) ?? ""}`;
  return text || "-";
};

// 계약 단건 응답(ContractResponse) → 상세 화면 뷰모델(ContractDetail).
// AI 리스크·코멘트·라이프사이클은 별도 기능이라 매핑 대상 아님(상세 페이지가 mock 유지).
export const toDetailView = (c: ContractResponse): ContractDetail => {
  const d = c.details;
  const firstMoney = d.money[0];
  const labelParts = c.categoryLabel
    ? c.categoryLabel.split(CATEGORY_LABEL_SEPARATOR)
    : [];
  const catPath = [c.party, ...labelParts].filter(
    (x): x is string => Boolean(x),
  );
  return {
    id: c.code,
    name: c.title,
    status: getStatusLabel(c.status),
    secure: c.securityLevel !== "normal",
    stage: d.stage === "new" ? "신규계약" : "변경·해지",
    requester: c.requesterId ?? "-",
    owner: c.ownerId ?? "미배정",
    catPath,
    period: fmtPeriod(c.periodStart, c.periodEnd, d.periodText),
    type: c.reviewType === "std" ? "표준계약서 계약체결" : "일반 검토요청",
    files: c.files.map((f) => ({
      name: f.name,
      meta: f.meta ?? "",
      kind: FILE_KIND[f.role],
    })),
    ccDept: c.references.filter((r) => r.ccType === "dept").map((r) => r.name),
    counter: c.counterparties[0]?.snapshot.name ?? "-",
    lang: LANG_LABEL[d.lang] ?? d.lang,
    legalCat: LEGAL_LABEL[d.legal] ?? "-",
    negotiation: d.negotiation,
    amount: {
      contract: firstMoney ? fmtMoney(firstMoney.amount, firstMoney.currency) : "-",
      vat: "-",
      total: "-",
    },
    payTerms: d.payTerms,
    purpose: d.purpose,
    notes: d.concerns,
  };
};
