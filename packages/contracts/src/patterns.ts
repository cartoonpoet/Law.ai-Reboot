export const AUTH_PATTERNS = {
  SIGNUP: "auth.signup",
  LOGIN: "auth.login",
  VALIDATE: "auth.validate",
  PASSWORD_RESET_REQUEST: "auth.password.resetRequest",
  PASSWORD_RESET_CONFIRM: "auth.password.resetConfirm",
  // 로그인한 사용자의 비밀번호 변경(현재 비밀번호 확인).
  PASSWORD_CHANGE: "auth.password.change",
  REFRESH: "auth.refresh",
  SWITCH_TENANT: "auth.switchTenant",
  MY_TENANTS: "auth.myTenants",
  // 온보딩 (Spec 4) — 토큰 발급·메일·권한 검사는 auth-service 소유.
  ADMIN_CREATE_TENANT: "auth.adminCreateTenant",
  INVITE_MEMBERS: "auth.inviteMembers",
  RESEND_INVITE: "auth.resendInvite",
  GET_INVITE: "auth.getInvite",
  ACCEPT_INVITE: "auth.acceptInvite",
} as const;

export const USER_PATTERNS = {
  CREATE: "user.create",
  FIND_BY_EMAIL: "user.findByEmail",
  FIND_BY_ID: "user.findById",
  SEARCH: "user.search",
  CREATE_RESET_TOKEN: "user.resetToken.create",
  CONSUME_RESET_TOKEN: "user.resetToken.consume",
  UPDATE_PASSWORD: "user.updatePassword",
  FIND_MEMBERSHIPS: "user.findMemberships",
  // 온보딩 (Spec 4) — 초대 저장·소비/멤버 목록/테넌트 생성.
  CREATE_TENANT: "user.tenant.create",
  LIST_TENANT_MEMBERS: "user.tenant.listMembers",
  CREATE_INVITATION: "user.invitation.create",
  ROTATE_INVITATION: "user.invitation.rotate",
  CANCEL_INVITATION: "user.invitation.cancel",
  FIND_INVITATION: "user.invitation.find",
  ACCEPT_INVITATION: "user.invitation.accept",
  // 내 정보 설정 — 이름·이메일 알림·프로필 사진.
  GET_PROFILE: "user.profile.get",
  UPDATE_PROFILE: "user.profile.update",
  AVATAR_UPLOAD_TARGET: "user.avatar.uploadTarget",
  AVATAR_CONFIRM: "user.avatar.confirm",
  AVATAR_REMOVE: "user.avatar.remove",
  AVATAR_SOURCE: "user.avatar.source",
} as const;

export const DEPARTMENT_PATTERNS = {
  LIST: "department.list",
} as const;

export const CONTRACT_CATEGORY_PATTERNS = {
  LIST: "contractCategory.list",
} as const;

export const COMPANY_PATTERNS = {
  SEARCH: "company.search",
  CREATE: "company.create",
} as const;

export const CONTRACT_PATTERNS = {
  CREATE: "contract.create",
  GET: "contract.get",
  LIST: "contract.list",
  UPDATE: "contract.update",
  UPDATE_STATUS: "contract.updateStatus",
  SUBMIT_APPROVAL: "contract.submitApproval",
  COMPLETE_SIGNING: "contract.completeSigning",
  // 체결 완료 등록(registerAs=signed) 확정 — completeSigning 과 별개(결재 라인 없음, 미배정
  // 생성자 권한으로 게이트).
  FINALIZE_REGISTRATION: "contract.finalizeRegistration",
  // 서명본 교체 — 체결된 계약, 법무팀 전용. 기존 서명본은 첨부로 내려 이력 보존.
  REPLACE_SIGNED_FILE: "contract.replaceSignedFile",
  // 계약 삭제(소프트 삭제) — 배정 전 생성자 본인 또는 시스템 관리자, 체결 결재 중 불가.
  DELETE: "contract.delete",
  // 중도 해지 — 체결 완료·계약 이행 계약을 해지일·사유·해지 합의서와 함께 종료(terminated).
  TERMINATE: "contract.terminate",
  // 만료 관리 "AI로 읽기" — 자동갱신·해지 통지 조항 추출(AiAnalysis kind renewalTerms) 트리거.
  ANALYZE_RENEWAL_TERMS: "contract.analyzeRenewalTerms",
  // 로그인 화면 공개 통계(검토된 계약 수) — 인증 없이 호출된다.
  PUBLIC_STATS: "contract.publicStats",
} as const;

// 법률자문 — 요청 · 조회 · 담당 배정 · 질의/회신 · 종결.
export const ADVICE_PATTERNS = {
  CREATE: "advice.create",
  LIST: "advice.list",
  GET: "advice.get",
  ASSIGN: "advice.assign",
  ADD_MESSAGE: "advice.addMessage",
  CLOSE: "advice.close",
  // 반려된 요청 결재를 다시 올린다.
  RESUBMIT_REQUEST_APPROVAL: "advice.resubmitRequestApproval",
} as const;

export const APPROVAL_PATTERNS = {
  DECIDE: "approval.decide",
  INBOX: "approval.inbox",
  GET_ACTIVE: "approval.getActive",
} as const;

export const COMMENT_PATTERNS = {
  CREATE: "comment.create",
  LIST: "comment.list",
  UPDATE: "comment.update",
  DELETE: "comment.delete",
} as const;

export const FILE_PATTERNS = {
  PRESIGN: "file.presign",
  CONFIRM: "file.confirm",
  GET_DOWNLOAD_URL: "file.getDownloadUrl",
  // 게이트웨이 파일 중계 — 다운로드 주소 토큰 확인 후 서버가 받아올 R2 단기 주소.
  GET_CONTENT_SOURCE: "file.getContentSource",
  // 게이트웨이 업로드 중계 — 업로드 토큰 확인 후 서버가 올릴 R2 단기 PUT 주소.
  GET_UPLOAD_TARGET: "file.getUploadTarget",
  // 두 파일 비교 결과 PDF 다운로드 — 감사 로그용 best-effort 기록. 응답은 빈 객체.
  AUDIT_COMPARE_REPORT: "file.auditCompareReport",
} as const;

export const ADMIN_PATTERNS = {
  // 어드민 대시보드 — 계약/사용자/파일/최근 비교보고서 다운로드 카운트.
  GET_STATS: "admin.getStats",
  // 감사 로그 조회(actor·회사·대상 이름 포함). 기간·회사·행위·사람으로 걸러 보고 offset 으로 페이지를 넘긴다.
  GET_AUDIT: "admin.getAudit",
  // 고객사 목록 + 전체 KPI (Spec 3).
  LIST_TENANTS: "admin.listTenants",
  // 고객사 상세 집계 (Spec 3).
  GET_TENANT: "admin.getTenant",
  // 고객사 요금제/상태/체험판만료 변경 + 감사 기록 (Spec 3).
  UPDATE_TENANT: "admin.updateTenant",
  // 삭제된 계약 목록(전 고객사, 최근 삭제 순) — 회사·작성자·삭제한 사람.
  LIST_DELETED_CONTRACTS: "admin.listDeletedContracts",
  // 삭제된 계약 복구(deletedAt 해제) + 감사 기록.
  RESTORE_CONTRACT: "admin.restoreContract",
} as const;

// 문의·상담(user-service) — 사용자가 남긴 문의와 관리자 답변.
export const SUPPORT_PATTERNS = {
  CREATE_THREAD: "support.createThread",
  LIST_MY_THREADS: "support.listMyThreads",
  GET_THREAD: "support.getThread",
  ADD_MESSAGE: "support.addMessage",
  ADMIN_LIST: "support.adminList",
  ADMIN_GET: "support.adminGet",
  // 관리자 답변 — 만든 알림을 돌려주면 게이트웨이가 SSE 로 민다.
  ADMIN_REPLY: "support.adminReply",
} as const;

export const NOTIFICATION_PATTERNS = {
  // 계약 만료 임박 알림 만들기(게이트웨이 스케줄러가 매일 부르고 결과를 SSE 로 push).
  RUN_CONTRACT_EXPIRY_ALERTS: "notification.runContractExpiryAlerts",
  LIST: "notification.list",
  MARK_READ: "notification.markRead",
  MARK_ALL_READ: "notification.markAllRead",
} as const;

export const AI_PATTERNS = {
  ANALYZE: "ai.analyze",
  CHAT: "ai.chat",
  // 스캔 PDF 글자 읽기(이미지 → 글자). 계약서 본문에 글자 층이 없을 때만 부른다.
  READ_DOCUMENT: "ai.readDocument",
  LIST_MODELS: "ai.listModels",
} as const;

// AI 비서(user-service) — 사용자 업무 데이터를 모아 ai.chat 을 부르고 제안을 검증한다.
export const ASSISTANT_PATTERNS = {
  CHAT: "assistant.chat",
  BRIEF: "assistant.brief",
} as const;

export const AI_CREDENTIAL_PATTERNS = {
  GET: "aiCredential.get",
  SAVE: "aiCredential.save",
} as const;

export const AI_ANALYSIS_PATTERNS = {
  GET: "aiAnalysis.get",
  RETRY: "aiAnalysis.retry",
} as const;
