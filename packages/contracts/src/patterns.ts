export const AUTH_PATTERNS = {
  SIGNUP: "auth.signup",
  LOGIN: "auth.login",
  VALIDATE: "auth.validate",
} as const;

export const USER_PATTERNS = {
  CREATE: "user.create",
  FIND_BY_EMAIL: "user.findByEmail",
  FIND_BY_ID: "user.findById",
} as const;
