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
  });
  const modelsQuery = useQuery({
    queryKey: AI_MODELS_QUERY_KEY,
    queryFn: () => getAiModels("openai"),
  });

  const saveMutation = useMutation({
    mutationFn: (body: SaveMyAiCredentialBody) => saveMyAiCredential(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AI_MY_CREDENTIAL_QUERY_KEY }),
  });

  return {
    credential: credentialQuery.data ?? null,
    isLoading: credentialQuery.isLoading,
    isError: credentialQuery.isError,
    models: modelsQuery.data?.models ?? [],
    save: (body: SaveMyAiCredentialBody): Promise<MyAiCredentialDto> =>
      saveMutation.mutateAsync(body),
    isSaving: saveMutation.isPending,
  };
};
