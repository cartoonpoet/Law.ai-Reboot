// 관리자 콘솔 주소 — 배포에서는 같은 도메인 앞에 admin 을 붙인 하위 도메인(admin.lawai-reboot.kro.kr)이다.
// VITE_ADMIN_URL 이 있으면 그 값을 쓰고, 로컬 개발은 관리자 앱 개발 서버(5175)를 연다.
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export const getAdminConsoleUrl = (
  envUrl: string | undefined,
  location: { protocol: string; hostname: string },
): string => {
  if (envUrl) return envUrl;
  if (LOCAL_HOSTS.includes(location.hostname)) return `${location.protocol}//${location.hostname}:5175`;
  // 이미 admin 으로 시작하는 주소면 그대로(관리자 콘솔 안에서 열리는 경우).
  const host = location.hostname.startsWith("admin.") ? location.hostname : `admin.${location.hostname}`;
  return `${location.protocol}//${host}`;
};
