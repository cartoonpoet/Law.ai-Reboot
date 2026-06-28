export const AUTH_PATTERNS = {
  SIGNUP: "auth.signup",
  LOGIN: "auth.login",
  VALIDATE: "auth.validate",
  PASSWORD_RESET_REQUEST: "auth.password.resetRequest",
  PASSWORD_RESET_CONFIRM: "auth.password.resetConfirm",
  REFRESH: "auth.refresh",
} as const;

export const USER_PATTERNS = {
  CREATE: "user.create",
  FIND_BY_EMAIL: "user.findByEmail",
  FIND_BY_ID: "user.findById",
  SEARCH: "user.search",
  CREATE_RESET_TOKEN: "user.resetToken.create",
  CONSUME_RESET_TOKEN: "user.resetToken.consume",
  UPDATE_PASSWORD: "user.updatePassword",
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

export const NOTIFICATION_PATTERNS = {
  LIST: "notification.list",
  MARK_READ: "notification.markRead",
  MARK_ALL_READ: "notification.markAllRead",
} as const;
