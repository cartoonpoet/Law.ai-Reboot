// 계약 행 ↔ 응답/권한 입력 변환(순수). DB·Nest 의존 없음.
// 마스킹(maskCompany/maskSecret)은 get 에서만 적용된다 — toResponse 를 다른 곳에서 쓰면 마스킹되지 않는다.
import type { Prisma } from "@prisma/client";
import type {
  ApprovalLineDto,
  ApproverSnapshot,
  Company,
  ContractDetailsV1,
  ContractLinkRef,
  ContractResponse,
  ContractStage,
  ContractStatus,
  ContractSummary,
} from "@lawai/contracts";
import type { AuthzContract } from "./contracts.authz";

// Prisma 가 counterparties + 결재선(단계 포함)을 include 한 Contract 행
export const contractInclude = {
  requester: { select: { name: true } },
  owner: { select: { name: true } },
  counterparties: true,
  // 코멘트 첨부(File.commentId 가 있는 행)는 Comment 응답으로만 노출.
  // Contract.files 는 계약 본 파일만 — DocsCard 가 코멘트 첨부와 섞이지 않도록 같은 쿼리에서 분리.
  files: {
    where: { commentId: null },
    orderBy: [{ role: "asc" }, { sortOrder: "asc" }],
  },
  references: { orderBy: [{ ccType: "asc" }, { isSecret: "asc" }] },
  // 원 계약·파생 계약(갱신·변경·해지) 요약 — 상세 화면의 "연결된 계약".
  originContract: { select: { id: true, code: true, title: true, status: true, details: true, deletedAt: true } },
  derivedContracts: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, title: true, status: true, details: true },
  },
} satisfies Prisma.ContractInclude;

// 연결된 계약 행 → 짧은 요약. stage 는 details(JSONB)에 있어 꺼내 온다.
export const toContractLinkRef = (c: {
  id: string;
  code: string;
  title: string;
  status: ContractStatus;
  details: Prisma.JsonValue;
}): ContractLinkRef => ({
  id: c.id,
  code: c.code,
  title: c.title,
  status: c.status,
  stage: ((c.details as { stage?: ContractStage } | null)?.stage ?? "new") as ContractStage,
});

export type ContractWithRelations = Prisma.ContractGetPayload<{
  include: typeof contractInclude;
}>;

export const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// PII 마스킹: 앞 일부만 남기고 숫자/문자를 가린다.
const maskDigits = (v: string | null): string | null => {
  if (!v) return v;
  if (v.length <= 3) return "***";
  return v.slice(0, 3) + v.slice(3).replace(/[0-9A-Za-z]/g, "*");
};

const maskEmail = (v: string | null): string | null => {
  if (!v) return v;
  const [user, domain] = v.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
};

// 상대회사 스냅샷의 PII(사업자번호·연락처) 마스킹. 이름·대표자·주소는 유지.
export const maskCompany = (c: Company): Company => ({
  ...c,
  bizNo: maskDigits(c.bizNo) ?? c.bizNo,
  phone: maskDigits(c.phone),
  managerPhone: maskDigits(c.managerPhone),
  managerEmail: maskEmail(c.managerEmail),
});

// references 중 ccType==="user" 인 행들의 refId(= cc 사용자 id) 배열을 추출.
export const extractCcUserIds = (
  refs: { ccType: string; refId: string }[],
): string[] => refs.filter((r) => r.ccType === "user").map((r) => r.refId);

// contractInclude row → 권한 평가용 AuthzContract.
export const toAuthzContract = (row: ContractWithRelations): AuthzContract => ({
  createdById: row.createdById,
  ownerId: row.ownerId,
  requesterId: row.requesterId,
  ccUserIds: extractCcUserIds(row.references),
  status: row.status,
  securityLevel: row.securityLevel,
  departmentId: row.departmentId,
});

export const toResponse = (
  row: ContractWithRelations,
  line: ApprovalLineDto | null = null,
): ContractResponse => {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    status: row.status,
    securityLevel: row.securityLevel,
    reviewType: row.reviewType,
    party: row.party,
    categoryId: row.categoryId,
    categoryLabel: row.categoryLabel,
    requesterId: row.requesterId,
    requesterName: row.requester?.name ?? null,
    ownerId: row.ownerId,
    ownerName: row.owner?.name ?? null,
    createdById: row.createdById,
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
    dueDate: row.dueDate?.toISOString() ?? null,
    signedAt: row.signedAt ? row.signedAt.toISOString() : null,
    closedReason: row.closedReason ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    closedNote: row.closedNote ?? null,
    originContractId: row.originContractId ?? null,
    originContract:
      row.originContract && !row.originContract.deletedAt ? toContractLinkRef(row.originContract) : null,
    derivedContracts: (row.derivedContracts ?? []).map(toContractLinkRef),
    schemaVersion: row.schemaVersion,
    details: row.details as unknown as ContractDetailsV1,
    counterparties: row.counterparties.map((cp) => ({
      id: cp.id,
      companyId: cp.companyId,
      partyType: cp.partyType,
      snapshot: cp.snapshot as unknown as Company,
    })),
    approvalLine: line
      ? {
          id: line.id,
          status: line.status,
          steps: line.steps.map((s) => ({
            id: s.id,
            stepOrder: s.stepOrder,
            userId: s.userId,
            name: s.name,
            avatarUrl: s.avatarUrl,
            dept: s.dept,
            type: s.type,
            status: s.status,
            comment: s.comment,
            decidedAt: s.decidedAt,
          })),
          currentStepId: line.currentStepId,
          submittedById: line.submittedById,
          submittedAt: line.submittedAt,
        }
      : null,
    plannedApprovers:
      (row.details as unknown as { approvers?: ApproverSnapshot[] })
        .approvers ?? [],
    files: row.files.map((f) => ({
      id: f.id,
      role: f.role,
      name: f.name,
      meta: f.meta,
      size: f.size,
      mimeType: f.mimeType,
      storageKey: f.storageKey,
      sortOrder: f.sortOrder,
    })),
    references: row.references.map((r) => ({
      id: r.id,
      ccType: r.ccType,
      isSecret: r.isSecret,
      refId: r.refId,
      name: r.name,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

// list() 행(상대회사는 첫 1건만 include) → 목록 요약 한 줄.
type ContractListRow = Prisma.ContractGetPayload<{
  include: {
    requester: { select: { name: true } };
    owner: { select: { name: true } };
    counterparties: true;
  };
}>;

export const toContractSummary = (r: ContractListRow): ContractSummary => {
  const first = r.counterparties[0];
  const snapshot = first ? (first.snapshot as unknown as Company) : null;
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    status: r.status,
    securityLevel: r.securityLevel,
    party: r.party,
    categoryLabel: r.categoryLabel,
    counterpartyName: snapshot?.name ?? null,
    requesterId: r.requesterId,
    requesterName: r.requester?.name ?? null,
    ownerId: r.ownerId,
    ownerName: r.owner?.name ?? null,
    dueDate: r.dueDate?.toISOString() ?? null,
    periodEnd: r.periodEnd?.toISOString() ?? null,
    signedAt: r.signedAt ? r.signedAt.toISOString() : null,
    createdById: r.createdById,
    updatedAt: r.updatedAt.toISOString(),
  };
};
