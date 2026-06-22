import type { CommentDto } from "@lawai/contracts";
import { apiFetch } from "./client";

// 계약 코멘트 목록 조회(생성순 asc). viewerId 는 gateway 가 JWT sub 로 주입(관련자 가드).
export function listComments(contractId: string): Promise<CommentDto[]> {
  return apiFetch<CommentDto[]>(`/contracts/${contractId}/comments`);
}

// 코멘트 작성. body 만 전송(작성자 = JWT sub).
export function createComment(
  contractId: string,
  body: string,
): Promise<CommentDto> {
  return apiFetch<CommentDto>(`/contracts/${contractId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
