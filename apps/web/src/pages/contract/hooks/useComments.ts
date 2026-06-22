import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from "../../../api/comments";
import { NOTIFICATIONS_QUERY_KEY } from "../../../components/layout/hooks/useNotifications";

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

  // 멘션 작성/수정 시 멘션 대상의 알림이 생성되므로 알림 쿼리도 함께 무효화한다.
  // (작성자 본인은 자기멘션 제외라 알림이 없지만 일관성·즉시성 위해 갱신.)
  const invalidateComments = () => {
    invalidate();
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  };

  const mutation = useMutation({
    mutationFn: ({ body, mentions }: AddCommentInput) =>
      createComment(contractId, body, mentions),
    onSuccess: invalidateComments,
  });

  const editMutation = useMutation({
    mutationFn: ({ commentId, body, mentions }: EditCommentInput) =>
      updateComment(contractId, commentId, body, mentions),
    onSuccess: invalidateComments,
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
