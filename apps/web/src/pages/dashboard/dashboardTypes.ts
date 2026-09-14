import type { ContractStatus } from "@lawai/contracts";
import type { AiInsightTarget } from "../../components/ai/useAiInsights";

// 할 일 종류 — 지금 실제 데이터가 있는 업무만. 자문·송무 등 화면이 생기면 여기에 추가.
export type TodoTypes = "계약" | "결재";

export const TODO_TAG_COLOR: Record<TodoTypes, "primary" | "info"> = {
  계약: "primary",
  결재: "info",
};

export interface TodoItem {
  key: string;
  type: TodoTypes;
  code: string | null;
  title: string;
  status: string;
  action: string;
  // 검토기한까지 남은 날. 기한이 없으면 null.
  daysLeft: number | null;
  path: string;
  // 이 할 일에 붙일 AI 분석(계약 상태별 kind). AI 분석을 제공하지 않는 단계면 null.
  aiTarget: AiInsightTarget | null;
}

export type StageToneTypes = "danger" | "success" | "neutral";

export interface FlowStage {
  status: ContractStatus;
  label: string;
  count: number;
  // 처리 대기 중인 단계 중 건수가 가장 많은 단계
  isBusiest: boolean;
  tone: StageToneTypes;
}

export interface DeadlineItem {
  id: string;
  code: string;
  title: string;
  dueDate: string;
  daysLeft: number;
  status: string;
  path: string;
}
