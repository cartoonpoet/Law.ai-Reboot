export const AUTH_PATTERNS = {
  SIGNUP: "auth.signup",
  LOGIN: "auth.login",
  VALIDATE: "auth.validate",
  PASSWORD_RESET_REQUEST: "auth.password.resetRequest",
  PASSWORD_RESET_CONFIRM: "auth.password.resetConfirm",
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
