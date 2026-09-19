// 사이드바 메뉴 정의 — 사이드바와 통합검색(메뉴로 이동)이 함께 쓰는 단일 출처.
export const NAV_SECTIONS = [
  {
    label: "개요",
    items: [
      { id: "home", label: "홈", icon: "home", path: "/" },
      { id: "stats", label: "업무 통계", icon: "barChart", path: "/stats" },
    ],
  },
  {
    label: "계약 관리",
    items: [
      { id: "c-request", label: "계약서 검토 요청", icon: "filePlus", path: "/contract/request" },
      { id: "c-list", label: "계약 조회", icon: "fileFind", path: "/contract/list" },
      { id: "c-expiring", label: "만료 관리", icon: "calendar", path: "/contract/expiring" },
    ],
  },
  {
    label: "결재",
    items: [
      { id: "approval-inbox", label: "결재 대기함", icon: "factCheck", path: "/approvals/inbox" },
    ],
  },
  {
    label: "법률자문",
    items: [
      { id: "advice-request", label: "법률자문 요청", icon: "law", path: "/advice/request" },
      { id: "advice-list", label: "법률자문 조회", icon: "fileFind", path: "/advice/list" },
    ],
  },
  {
    label: "법무 업무",
    items: [
      { id: "litigation", label: "송무", icon: "litigation", path: "/litigation" },
      { id: "seal", label: "인감 사용 신청", icon: "seal", path: "/seal" },
      { id: "ip", label: "지식재산권", icon: "iPRs", path: "/ip" },
    ],
  },
  {
    label: "도구",
    items: [
      { id: "ai", label: "AI 분석", icon: "aI", path: "/ai" },
      { id: "doc", label: "문서관리", icon: "folder", path: "/doc" },
    ],
  },
  {
    label: "관리",
    items: [
      { id: "members", label: "멤버 관리", icon: "users", path: "/members" },
      { id: "system", label: "시스템 관리", icon: "settings", path: "/system" },
    ],
  },
] as const;

export type NavItemTypes = (typeof NAV_SECTIONS)[number]["items"][number];

export const NAV_ITEMS: readonly NavItemTypes[] = NAV_SECTIONS.flatMap(
  (section): readonly NavItemTypes[] => section.items,
);
