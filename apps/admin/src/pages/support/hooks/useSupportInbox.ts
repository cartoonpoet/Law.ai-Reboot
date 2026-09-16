import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupportStatusTypes } from "@lawai/contracts";
import {
  getAdminSupportThread,
  listAdminSupportThreads,
  replyAdminSupportThread,
} from "../../../api/adminSupport";

export const SUPPORT_INBOX_QUERY_KEY = ["admin-support"] as const;
const PAGE_SIZE = 50;

export type SupportFilterTypes = SupportStatusTypes | "";

/** 문의함 — 상태로 거른 목록과 열어 본 문의 하나, 그리고 답변 보내기. */
export const useSupportInbox = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SupportFilterTypes>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: [...SUPPORT_INBOX_QUERY_KEY, status],
    queryFn: () => listAdminSupportThreads({ status, limit: PAGE_SIZE }),
  });

  const threadQuery = useQuery({
    queryKey: [...SUPPORT_INBOX_QUERY_KEY, "thread", selectedId],
    queryFn: () => getAdminSupportThread(selectedId as string),
    enabled: selectedId !== null,
  });

  const replyMutation = useMutation({
    mutationFn: (input: { threadId: string; body: string; close?: boolean }) =>
      replyAdminSupportThread(input.threadId, { body: input.body, close: input.close }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPORT_INBOX_QUERY_KEY }),
  });

  const changeStatus = (next: SupportFilterTypes) => {
    setStatus(next);
    setSelectedId(null);
  };

  return {
    status,
    changeStatus,
    selectedId,
    select: setSelectedId,
    threads: listQuery.data?.items ?? [],
    openCount: listQuery.data?.openCount ?? 0,
    isLoading: listQuery.isLoading,
    thread: threadQuery.data ?? null,
    isThreadLoading: threadQuery.isLoading,
    isReplying: replyMutation.isPending,
    replyError: replyMutation.error,
    reply: (input: { threadId: string; body: string; close?: boolean }) => replyMutation.mutateAsync(input),
  };
};
