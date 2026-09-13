import type {
  AiAnalysisDto,
  AiListModelsResult,
  MyAiCredentialDto,
  SaveMyAiCredentialRequest,
} from "@lawai/contracts";
import { apiFetch, apiFetchVoid, apiFetchNullable } from "./client";

// 게이트웨이 GET /ai/my-credential은 자격증명이 없으면 null을 반환한다(AiController.getMyCredential).
// NestJS는 null 리턴 시 빈 HTTP 바디로 응답하므로 apiFetch<T>(항상 res.json() 호출)는
// 파싱 에러를 던진다 — apiFetchNullable 사용.
export const getMyAiCredential = (): Promise<MyAiCredentialDto | null> =>
  apiFetchNullable<MyAiCredentialDto>("/ai/my-credential");

export const saveMyAiCredential = (
  body: Pick<SaveMyAiCredentialRequest, "provider" | "model" | "apiKey">,
): Promise<MyAiCredentialDto> =>
  apiFetch<MyAiCredentialDto>("/ai/my-credential", {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const getAiModels = (provider: string): Promise<AiListModelsResult> =>
  apiFetch<AiListModelsResult>(
    `/ai/my-credential/models?${new URLSearchParams({ provider }).toString()}`,
  );

// 게이트웨이 GET /ai/analysis는 분석 행이 없으면 null을 반환한다(AiController.getAnalysis).
// NestJS는 null 리턴 시 빈 HTTP 바디로 응답하므로 apiFetch<T>(항상 res.json() 호출)는
// 파싱 에러를 던진다 — apiFetchNullable 사용.
export const getAiAnalysis = (
  targetType: string,
  targetId: string,
  kind: string,
): Promise<AiAnalysisDto | null> =>
  apiFetchNullable<AiAnalysisDto>(
    `/ai/analysis?${new URLSearchParams({ targetType, targetId, kind }).toString()}`,
  );

// 게이트웨이 POST /ai/analysis/retry는 본문 없이 void를 반환한다(AiController.retryAnalysis).
// apiFetch<T>는 항상 res.json()을 호출하므로 빈 바디에서 파싱 에러가 난다 — apiFetchVoid 사용.
export const retryAiAnalysis = (
  targetType: string,
  targetId: string,
  kind: string,
): Promise<void> =>
  apiFetchVoid("/ai/analysis/retry", {
    method: "POST",
    body: JSON.stringify({ targetType, targetId, kind }),
  });
