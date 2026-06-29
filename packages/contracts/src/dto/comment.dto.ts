import type { TenantContext } from "./tenant.dto";
import type { NotificationDto } from "./notification.dto";
import type { FileAttachmentDto } from "./file.dto";

// 코멘트에 멘션된 사용자 스냅(표시용). mentions 배열이 정규 출처.
export interface MentionDto {
  userId: string;
  name: string;
}

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
  // 수정 시각. createdAt 과 비교해 "(수정됨)" 판정(항상 내려줌).
  updatedAt: string;
  // 소프트 삭제 여부(true 면 body 는 placeholder, mentions 는 비움).
  isDeleted: boolean;
  // viewer 가 작성자 본인인지(프론트 수정/삭제 버튼 노출용).
  isAuthor: boolean;
  // 멘션된 사용자 목록(정규 출처).
  mentions: MentionDto[];
  // 첨부 파일(코멘트당 ≤5). 소프트 삭제 시 [].
  attachments: FileAttachmentDto[];
}

// 코멘트 생성. viewerId 는 gateway 가 JWT sub 를 주입(작성자 = authorId 겸용).
export interface CreateCommentRequest {
  contractId: string;
  body: string;
  // 멘션 대상 userId 배열(계약 관련자 한정, 서버가 검증).
  mentions?: string[];
  // 선업로드(presign/confirm)된 첨부 파일 id 배열 — comments.service 가
  // 트랜잭션 내에서 File.commentId 연결(소유 검증: contractId 일치 + commentId NULL).
  attachmentIds?: string[];
  viewerId?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

// 코멘트 목록 조회. viewerId 는 관련자 가드용(gateway 가 JWT sub 주입).
export interface ListCommentsRequest {
  contractId: string;
  viewerId?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

// 코멘트 수정. 작성자 본인만 가능(서버가 viewerId 로 판정).
export interface UpdateCommentRequest {
  contractId: string;
  commentId: string;
  body: string;
  // 멘션 대상 userId 배열(전체 교체).
  mentions?: string[];
  // 첨부 파일 id 배열(전체 교체). 배열로 들어오면 desired 기준 detach(빠진 id)/attach(새 id) 를
  // 같은 트랜잭션에서 적용한다. undefined 면 기존 첨부 유지(변경 없음). 코멘트당 ≤5.
  attachmentIds?: string[];
  viewerId?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

// 코멘트 삭제(소프트). 작성자 본인만 가능(서버가 viewerId 로 판정).
export interface DeleteCommentRequest {
  contractId: string;
  commentId: string;
  viewerId?: string;
  // gateway 가 JWT 에서 추출해 주입(테넌트 격리).
  tenantContext?: TenantContext;
}

// gateway 가 SSE 허브로 push 할 단위. recipientId 별 NotificationDto(수신자 1명당 1건).
export interface PushNotification {
  recipientId: string;
  notification: NotificationDto;
}

// 코멘트 생성/수정 RPC 응답 wrapper. comment 는 HTTP 응답으로, notifications 는 gateway 가 SSE push.
export interface CreateCommentResult {
  comment: CommentDto;
  notifications: PushNotification[];
}
