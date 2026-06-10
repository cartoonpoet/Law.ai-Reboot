export function assertAuthEnv(env: NodeJS.ProcessEnv = process.env): void {
  const required = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`필수 환경변수 누락: ${missing.join(", ")}`);
  }
}
