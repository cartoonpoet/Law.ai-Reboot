// AI 비서가 "지금 보고 있는 화면"으로 쓰는 이름. 사이드바 메뉴 이름과 맞춘다.
const SCREEN_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/$/, label: "대시보드" },
  { pattern: /^\/contract\/list$/, label: "계약 조회" },
  { pattern: /^\/contract\/request$/, label: "계약서 검토 요청" },
  { pattern: /^\/contract\/[^/]+\/edit$/, label: "계약 수정" },
  { pattern: /^\/contract\/[^/]+$/, label: "계약 상세" },
  { pattern: /^\/approvals\/inbox$/, label: "결재 대기함" },
  { pattern: /^\/members$/, label: "멤버 관리" },
  { pattern: /^\/system$/, label: "시스템 관리" },
];

export const getScreenLabel = (pathname: string) =>
  SCREEN_LABELS.find(({ pattern }) => pattern.test(pathname))?.label ?? "Law.ai";
