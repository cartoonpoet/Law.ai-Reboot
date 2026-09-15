import type { ContractResponse } from "@lawai/contracts";
import { contractRequestDefaults, type ContractRequestForm } from "./request-schema";
import { toEditDefaults } from "./toEditDefaults";

export type DerivedStageTypes = Exclude<ContractRequestForm["stage"], "new">;

const DAY_MS = 86_400_000;

const TITLE_SUFFIX: Record<DerivedStageTypes, string> = {
  renew: " (갱신)",
  change: " (변경)",
  terminate: " (해지 합의)",
};

const toDateOnly = (time: number): string => new Date(time).toISOString().slice(0, 10);

// 갱신 기간 제안 — 원 계약 만료 다음 날부터 원 계약과 같은 길이. 원 계약 기간을 모르면 비워 둔다.
const getRenewalPeriod = (origin: ContractResponse): { periodStart: string; periodEnd: string } => {
  if (!origin.periodStart || !origin.periodEnd) return { periodStart: "", periodEnd: "" };
  const start = new Date(origin.periodStart).getTime();
  const end = new Date(origin.periodEnd).getTime();
  const nextStart = end + DAY_MS;
  return { periodStart: toDateOnly(nextStart), periodEnd: toDateOnly(nextStart + (end - start)) };
};

/**
 * 원 계약에서 갱신·변경·해지 요청 폼 기본값을 만든다.
 * 상대 계약자·분류·보안 등급·참조·금액·목적 같은 내용은 가져오고, 계약서·첨부·체결 정보·결재선은 새 요청이라 비운다.
 */
export const toDerivedRequestDefaults = (
  origin: ContractResponse,
  stage: DerivedStageTypes,
  requesterId: string,
): ContractRequestForm => {
  const base = toEditDefaults(origin);
  const period = stage === "renew" ? getRenewalPeriod(origin) : { periodStart: base.periodStart, periodEnd: base.periodEnd };
  return {
    ...base,
    stage,
    originContract: { id: origin.id, code: origin.code, title: origin.title },
    name: `${origin.title}${TITLE_SUFFIX[stage]}`,
    requester: requesterId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    periodText: "",
    periodManual: false,
    registerAs: "review",
    signedAt: "",
    expectedDate: "",
    contractFiles: [],
    attachFiles: [],
    refFiles: [],
    signedFiles: [],
    relatedDocs: [],
    approvers: contractRequestDefaults.approvers,
  };
};
