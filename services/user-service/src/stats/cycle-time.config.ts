import type { CycleTimeTargetTypes } from "@lawai/contracts";

/**
 * 어느 상태에 며칠까지 머무는 것을 정상으로 볼지.
 * 지금은 코드에 고정한다 — 회사마다 다르게 두는 것은 결재 규칙 설정(룰 빌더)과 함께 화면으로 옮긴다.
 */
export interface StageConfig {
  status: string;
  label: string;
  targetDays: number;
}

export interface TargetConfig {
  /** 이 상태들에 머문 시간을 잰다(순서대로 화면에 나온다) */
  stages: StageConfig[];
  /** 끝났다고 보는 상태 */
  doneStatuses: string[];
  /** 처음부터 끝까지 걸린 시간의 이름과 목표일 */
  totalLabel: string;
  totalTargetDays: number;
}

const CONTRACT_CONFIG: TargetConfig = {
  stages: [
    { status: "unassigned", label: "접수 · 배정 대기", targetDays: 1 },
    { status: "assigning", label: "배정 중", targetDays: 1 },
    { status: "legalReview", label: "법무 검토", targetDays: 3 },
    { status: "requesterReview", label: "요청자 검토", targetDays: 2 },
    { status: "reviewDone", label: "상신 대기", targetDays: 1 },
    { status: "signing", label: "체결 진행", targetDays: 5 },
  ],
  doneStatuses: ["signed", "fulfilling", "closed"],
  totalLabel: "접수 → 체결",
  totalTargetDays: 10,
};

const ADVICE_CONFIG: TargetConfig = {
  stages: [
    { status: "requestApproval", label: "요청 결재", targetDays: 1 },
    { status: "received", label: "배정 대기", targetDays: 1 },
    { status: "reviewing", label: "법무 검토", targetDays: 3 },
    { status: "waitingRequester", label: "요청자 답변 대기", targetDays: 3 },
    { status: "answerApproval", label: "회신 결재", targetDays: 1 },
  ],
  doneStatuses: ["answered", "closed"],
  totalLabel: "접수 → 회신",
  totalTargetDays: 7,
};

export const getTargetConfig = (targetType: CycleTimeTargetTypes): TargetConfig =>
  targetType === "contract" ? CONTRACT_CONFIG : ADVICE_CONFIG;

export const getStageLabel = (targetType: CycleTimeTargetTypes, status: string): string =>
  getTargetConfig(targetType).stages.find((stage) => stage.status === status)?.label ?? status;

export const getStageTargetDays = (targetType: CycleTimeTargetTypes, status: string): number | null =>
  getTargetConfig(targetType).stages.find((stage) => stage.status === status)?.targetDays ?? null;

const SEOUL = "Asia/Seoul";

/** 한국 시간 기준 YYYY-MM-DD. sv-SE 로케일이 그 형식을 그대로 준다. */
const toSeoulDateText = (date: Date): string => date.toLocaleDateString("sv-SE", { timeZone: SEOUL });

/**
 * 기간을 안 주면 5개월 전 그달 1일부터 오늘까지.
 * 한국 시간 기준이다 — UTC 로 재면 오전 9시 이전에 "오늘"이 어제가 되고,
 * 매월 1일 오전에는 이번 달이 통째로 빠진다(화면 기본값이 하루/한 달 밀린다).
 */
export const getDefaultRange = (now: Date): { from: string; to: string } => {
  const to = toSeoulDateText(now);
  const [year, month] = to.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1 - 5, 1));
  return { from: start.toISOString().slice(0, 10), to };
};

/** 소수 첫째 자리까지. 값이 없으면 null 그대로. */
export const roundDays = (value: number | null): number | null =>
  value === null || Number.isNaN(value) ? null : Math.round(value * 10) / 10;
