export const AUTH_PATTERNS = {
  SIGNUP: "auth.signup",
  LOGIN: "auth.login",
  VALIDATE: "auth.validate",
  PASSWORD_RESET_REQUEST: "auth.password.resetRequest",
  PASSWORD_RESET_CONFIRM: "auth.password.resetConfirm",
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
  // 두 파일 비교 결과 PDF 다운로드 — 감사 로그용 best-effort 기록. 응답은 빈 객체.
  AUDIT_COMPARE_REPORT: "file.auditCompareReport",
} as const;

export const ADMIN_PATTERNS = {
  // 어드민 대시보드 — 계약/사용자/파일/최근 비교보고서 다운로드 카운트.
  GET_STATS: "admin.getStats",
  // 최근 감사 로그(actor 이름 포함). limit 로 페이지네이션.
  GET_AUDIT: "admin.getAudit",
  // 고객사 목록 + 전체 KPI (Spec 3).
  LIST_TENANTS: "admin.listTenants",
  // 고객사 상세 집계 (Spec 3).
  GET_TENANT: "admin.getTenant",
  // 고객사 요금제/상태/체험판만료 변경 + 감사 기록 (Spec 3).
  UPDATE_TENANT: "admin.updateTenant",
} as const;

export const NOTIFICATION_PATTERNS = {
  LIST: "notification.list",
  MARK_READ: "notification.markRead",
  MARK_ALL_READ: "notification.markAllRead",
} as const;

export const AI_PATTERNS = {
  ANALYZE: "ai.analyze",
  LIST_MODELS: "ai.listModels",
} as const;

export const AI_CREDENTIAL_PATTERNS = {
  GET: "aiCredential.get",
  SAVE: "aiCredential.save",
} as const;

export const AI_ANALYSIS_PATTERNS = {
  GET: "aiAnalysis.get",
  RETRY: "aiAnalysis.retry",
} as const;
