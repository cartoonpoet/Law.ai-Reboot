import type { CommentDto } from "@lawai/contracts";
import { apiFetch } from "./client";

// 계약 코멘트 목록 조회(생성순 asc). viewerId 는 gateway 가 JWT sub 로 주입(관련자 가드).
export function listComments(contractId: string): Promise<CommentDto[]> {
  return apiFetch<CommentDto[]>(`/contracts/${contractId}/comments`);
}

// 코멘트 작성. body + 멘션 대상 userId 배열 전송(작성자 = JWT sub).
// mentions 는 선택 — 비관련자 userId 가 섞이면 서버가 400 으로 거부(안전망).
export function createComment(
  contractId: string,
  body: string,
  mentions?: string[],
): Promise<CommentDto> {
  return apiFetch<CommentDto>(`/contracts/${contractId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, mentions }),
  });
}

// 코멘트 수정(작성자 본인만). body + 멘션 전체 교체. 비관련자 멘션은 서버가 400.
export function updateComment(
  contractId: string,
  commentId: string,
  body: string,
  mentions?: string[],
): Promise<CommentDto> {
  return apiFetch<CommentDto>(`/contracts/${contractId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ body, mentions }),
  });
}

// 코멘트 삭제(소프트, 작성자 본인만). 응답은 placeholder CommentDto — 프론트는 invalidate.
export function deleteComment(
  contractId: string,
  commentId: string,
): Promise<CommentDto> {
  return apiFetch<CommentDto>(`/contracts/${contractId}/comments/${commentId}`, {
    method: "DELETE",
  });
}
