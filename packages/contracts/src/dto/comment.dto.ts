// 코멘트 조회 응답. 작성자 이름/역할 스냅을 포함한다(별도 GET /comments 조회).
export interface CommentDto {
  id: string;
  contractId: string;
  authorId: string;
  authorName: string;
  // 작성 시점 작성자 role 스냅(표시용).
  role: string;
  body: string;
  createdAt: string;
}

// 코멘트 생성. viewerId 는 gateway 가 JWT sub 를 주입(작성자 = authorId 겸용).
export interface CreateCommentRequest {
  contractId: string;
  body: string;
  viewerId?: string;
}

// 코멘트 목록 조회. viewerId 는 관련자 가드용(gateway 가 JWT sub 주입).
export interface ListCommentsRequest {
  contractId: string;
  viewerId?: string;
}
