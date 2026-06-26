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
} as const;

export const NOTIFICATION_PATTERNS = {
  LIST: "notification.list",
  MARK_READ: "notification.markRead",
  MARK_ALL_READ: "notification.markAllRead",
} as const;
