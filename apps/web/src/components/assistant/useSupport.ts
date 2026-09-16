import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupportContext } from "@lawai/contracts";
import {
  addSupportMessage,
  createSupportThread,
  getSupportThread,
  listMySupportThreads,
} from "../../api/support";

export const SUPPORT_THREADS_QUERY_KEY = ["support-threads"] as const;

/**
 * 문의·상담 — 내 문의 목록과 열어 본 문의 하나.
 * 관리자 답변은 알림(SSE)으로 오고, 알림에서 문의를 열면 이 훅이 다시 불러온다.
 */
export const useSupport = (threadId: string | null) => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: SUPPORT_THREADS_QUERY_KEY,
    queryFn: listMySupportThreads,
    meta: { errorMode: "silent" },
  });

  const threadQuery = useQuery({
    queryKey: [...SUPPORT_THREADS_QUERY_KEY, threadId],
    queryFn: () => getSupportThread(threadId as string),
    enabled: threadId !== null,
    meta: { errorMode: "silent" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: SUPPORT_THREADS_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (input: { subject: string; body: string; context?: SupportContext }) =>
      createSupportThread(input),
    onSuccess: invalidate,
    meta: { errorTitle: "문의를 보내지 못했어요" },
  });

  const replyMutation = useMutation({
    mutationFn: (input: { threadId: string; body: string }) =>
      addSupportMessage(input.threadId, input.body),
    onSuccess: invalidate,
    meta: { errorTitle: "메시지를 보내지 못했어요" },
  });

  return {
    threads: listQuery.data?.threads ?? [],
    answeredCount: listQuery.data?.answeredCount ?? 0,
    isLoading: listQuery.isLoading,
    thread: threadQuery.data ?? null,
    isThreadLoading: threadQuery.isLoading,
    isSending: createMutation.isPending || replyMutation.isPending,
    // 새 문의를 보내면 만들어진 문의 id 를 돌려준다(바로 그 문의를 열도록).
    createThread: (input: { subject: string; body: string; context?: SupportContext }) =>
      createMutation.mutateAsync(input).then((thread) => thread.id),
    sendMessage: (input: { threadId: string; body: string }) => replyMutation.mutateAsync(input),
  };
};
