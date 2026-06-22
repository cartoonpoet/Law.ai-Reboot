import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createComment, listComments } from "../../../api/comments";

// 계약 코멘트 조회 + 작성. 작성 성공 시 목록 캐시 무효화로 재조회.
export const useComments = (contractId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comments", contractId],
    queryFn: () => listComments(contractId),
    enabled: Boolean(contractId),
  });

  const mutation = useMutation({
    mutationFn: (body: string) => createComment(contractId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", contractId] });
    },
  });

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    // addComment 는 mutateAsync — CommentForm(React19 폼 액션)이 await 해 성공/실패 분기.
    addComment: (body: string) => mutation.mutateAsync(body),
    error: query.error instanceof Error ? query.error.message : null,
  };
};
