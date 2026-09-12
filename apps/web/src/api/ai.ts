import type {
  AiAnalysisDto,
  AiListModelsResult,
  MyAiCredentialDto,
  SaveMyAiCredentialRequest,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export const getMyAiCredential = (): Promise<MyAiCredentialDto | null> =>
  apiFetch<MyAiCredentialDto | null>("/ai/my-credential");

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

// Task 10(대상별 AI 분석 조회/재시도)에서 사용 — 이 화면에서는 호출하지 않는다.
export const getAiAnalysis = (
  targetType: string,
  targetId: string,
  kind: string,
): Promise<AiAnalysisDto> =>
  apiFetch<AiAnalysisDto>(
    `/ai/analysis?${new URLSearchParams({ targetType, targetId, kind }).toString()}`,
  );

export const retryAiAnalysis = (
  targetType: string,
  targetId: string,
  kind: string,
): Promise<AiAnalysisDto> =>
  apiFetch<AiAnalysisDto>("/ai/analysis/retry", {
    method: "POST",
    body: JSON.stringify({ targetType, targetId, kind }),
  });
