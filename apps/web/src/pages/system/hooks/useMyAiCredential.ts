import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MyAiCredentialDto, SaveMyAiCredentialRequest } from "@lawai/contracts";
import { getAiModels, getMyAiCredential, saveMyAiCredential } from "../../../api/ai";

export const AI_MY_CREDENTIAL_QUERY_KEY = ["myAiCredential"] as const;
export const AI_MODELS_QUERY_KEY = ["aiModels", "openai"] as const;

type SaveMyAiCredentialBody = Pick<SaveMyAiCredentialRequest, "provider" | "model" | "apiKey">;

// 설정 화면의 데이터·동작 집약 훅 (컨벤션: 로직은 use~ 훅으로 분리).
export const useMyAiCredential = () => {
  const queryClient = useQueryClient();
  const credentialQuery = useQuery({
    queryKey: AI_MY_CREDENTIAL_QUERY_KEY,
    queryFn: getMyAiCredential,
    // 화면의 주 데이터 — 실패하면 본문을 오류 페이지로.
    meta: { errorMode: "page" },
  });
  const modelsQuery = useQuery({
    queryKey: AI_MODELS_QUERY_KEY,
    queryFn: () => getAiModels("openai"),
    meta: { errorTitle: "AI 모델 목록을 불러오지 못했어요" },
  });

  const saveMutation = useMutation({
    mutationFn: (body: SaveMyAiCredentialBody) => saveMyAiCredential(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AI_MY_CREDENTIAL_QUERY_KEY }),
    // 저장 실패는 화면이 입력란 아래에 인라인으로 보여준다.
    meta: { errorMode: "silent" },
  });

  return {
    credential: credentialQuery.data ?? null,
    isLoading: credentialQuery.isLoading,
    models: modelsQuery.data?.models ?? [],
    save: (body: SaveMyAiCredentialBody): Promise<MyAiCredentialDto> =>
      saveMutation.mutateAsync(body),
    isSaving: saveMutation.isPending,
  };
};
