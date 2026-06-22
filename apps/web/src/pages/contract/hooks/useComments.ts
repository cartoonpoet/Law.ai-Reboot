import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from "../../../api/comments";

interface AddCommentInput {
  body: string;
  mentions?: string[];
}

interface EditCommentInput {
  commentId: string;
  body: string;
  mentions?: string[];
}

// 계약 코멘트 조회 + 작성. 작성 성공 시 목록 캐시 무효화로 재조회.
export const useComments = (contractId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comments", contractId],
    queryFn: () => listComments(contractId),
    enabled: Boolean(contractId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["comments", contractId] });

  const mutation = useMutation({
    mutationFn: ({ body, mentions }: AddCommentInput) =>
      createComment(contractId, body, mentions),
    onSuccess: invalidate,
  });

  const editMutation = useMutation({
    mutationFn: ({ commentId, body, mentions }: EditCommentInput) =>
      updateComment(contractId, commentId, body, mentions),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(contractId, commentId),
    onSuccess: invalidate,
  });

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    // addComment 는 mutateAsync — CommentForm(React19 폼 액션)이 await 해 성공/실패 분기.
    addComment: (body: string, mentions?: string[]) =>
      mutation.mutateAsync({ body, mentions }),
    // editComment 도 mutateAsync — CommentItem 인라인 편집 폼이 await.
    editComment: (commentId: string, body: string, mentions?: string[]) =>
      editMutation.mutateAsync({ commentId, body, mentions }),
    deleteComment: (commentId: string) => deleteMutation.mutateAsync(commentId),
    isEditing: editMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: query.error instanceof Error ? query.error.message : null,
  };
};
