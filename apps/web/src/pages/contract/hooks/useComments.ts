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
  attachmentIds?: string[];
}

interface EditCommentInput {
  commentId: string;
  body: string;
  mentions?: string[];
  // 배열이면 첨부 전체교체(빠진 건 detach, 새 건 attach). undefined 면 기존 첨부 유지.
  attachmentIds?: string[];
}

// 계약 코멘트 조회 + 작성. 작성 성공 시 목록 캐시 무효화로 재조회.
export const useComments = (contractId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comments", contractId],
    queryFn: () => listComments(contractId),
    enabled: Boolean(contractId),
    // CommentPanel 이 조회 실패를 패널 안에 보여준다.
    meta: { errorMode: "silent" },
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
    mutationFn: ({ body, mentions, attachmentIds }: AddCommentInput) =>
      createComment(contractId, body, mentions, attachmentIds),
    onSuccess: invalidateComments,
    // 작성·수정·삭제 실패는 CommentForm / CommentItem 이 인라인으로 보여준다.
    meta: { errorMode: "silent" },
  });

  const editMutation = useMutation({
    mutationFn: ({ commentId, body, mentions, attachmentIds }: EditCommentInput) =>
      updateComment(contractId, commentId, body, mentions, attachmentIds),
    onSuccess: invalidateComments,
    meta: { errorMode: "silent" },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(contractId, commentId),
    onSuccess: invalidate,
    meta: { errorMode: "silent" },
  });

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    // addComment 는 mutateAsync — CommentForm(React19 폼 액션)이 await 해 성공/실패 분기.
    // attachmentIds 는 P3 — 선업로드(presign/confirm)된 첨부 id 배열.
    addComment: (
      body: string,
      mentions?: string[],
      attachmentIds?: string[],
    ) => mutation.mutateAsync({ body, mentions, attachmentIds }),
    // editComment 도 mutateAsync — CommentItem 인라인 편집 폼이 await.
    // attachmentIds 가 배열이면 첨부 전체교체. undefined 면 기존 첨부 유지.
    editComment: (
      commentId: string,
      body: string,
      mentions?: string[],
      attachmentIds?: string[],
    ) => editMutation.mutateAsync({ commentId, body, mentions, attachmentIds }),
    deleteComment: (commentId: string) => deleteMutation.mutateAsync(commentId),
    isEditing: editMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: query.error instanceof Error ? query.error.message : null,
  };
};
