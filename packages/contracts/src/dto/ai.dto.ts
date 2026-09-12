import type { TenantContext } from "./tenant.dto";

export type AiModelTier = "economy" | "standard" | "precision";
export interface AiModelOption {
  id: string;
  label: string;
  tier: AiModelTier;
}

// ai-service 내부 RPC(무상태 — 자기 DB 없음).
export interface AiAnalyzeRequest {
  kind: string;
  model: string;
  apiKey: string;
  payload: unknown;
}
export interface AiAnalyzeResult {
  result: unknown;
}
export interface AiListModelsRequest {
  provider: string;
}
export interface AiListModelsResult {
  models: AiModelOption[];
}

// 내 AI 연동 설정(개인별).
export interface GetMyAiCredentialRequest {
  viewerId?: string;
  tenantContext?: TenantContext;
}
export interface MyAiCredentialDto {
  provider: string;
  model: string;
  hasApiKey: boolean;
  lastVerifiedAt: string | null;
}
export interface SaveMyAiCredentialRequest {
  provider: string;
  model: string;
  apiKey: string;
  viewerId?: string;
  tenantContext?: TenantContext;
}

// 대상(계약 등)의 AI 분석 결과 조회/재시도.
export type AiAnalysisStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";
export interface AiAnalysisDto {
  kind: string;
  status: AiAnalysisStatus;
  result: unknown;
  errorMessage: string | null;
  triggeredByUserId: string;
  updatedAt: string;
}
export interface GetAiAnalysisRequest {
  targetType: string;
  targetId: string;
  kind: string;
  tenantContext?: TenantContext;
}
export interface RetryAiAnalysisRequest {
  targetType: string;
  targetId: string;
  kind: string;
  viewerId?: string;
  tenantContext?: TenantContext;
}
