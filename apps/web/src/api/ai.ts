import type {
  AiAnalysisDto,
  AiListModelsResult,
  MyAiCredentialDto,
  SaveMyAiCredentialRequest,
} from "@lawai/contracts";
import { apiFetch, apiFetchVoid } from "./client";

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
// 게이트웨이 GET /ai/analysis는 분석 행이 없으면 null을 반환한다(AiController.getAnalysis).
export const getAiAnalysis = (
  targetType: string,
  targetId: string,
  kind: string,
): Promise<AiAnalysisDto | null> =>
  apiFetch<AiAnalysisDto | null>(
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
