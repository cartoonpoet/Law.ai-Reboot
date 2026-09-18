import type { IconName } from "@lawkit/ui";

export interface AdminNavItem {
  id: string;
  label: string;
  icon: IconName;
  // 아직 만들지 않은 메뉴는 경로가 없다(눌리지 않고 흐리게 보인다).
  path?: string;
}

/** 관리자 콘솔 메뉴 — 사이드바 단일 출처. */
export const ADMIN_NAV_SECTIONS: { label: string; items: AdminNavItem[] }[] = [
  {
    label: "개요",
    items: [
      { id: "dashboard", label: "대시보드", icon: "home", path: "/" },
      { id: "tenants", label: "고객사", icon: "briefcase", path: "/tenants" },
    ],
  },
  {
    label: "고객 지원",
    items: [{ id: "support", label: "문의함", icon: "messageCircle", path: "/support" }],
  },
  {
    label: "관리",
    items: [
      { id: "users", label: "사용자", icon: "users" },
      { id: "deleted", label: "삭제된 계약", icon: "fileText", path: "/contracts/deleted" },
      { id: "forms", label: "표준양식", icon: "folder" },
      { id: "categories", label: "카테고리", icon: "tag" },
    ],
  },
  {
    label: "감사",
    items: [
      { id: "audit", label: "감사 로그", icon: "shield", path: "/audit" },
      { id: "system", label: "시스템 상태", icon: "monitor" },
    ],
  },
];

// 현재 화면이 이 메뉴인지 — 루트는 정확히 일치, 나머지는 하위 경로 포함.
export const checkNavActive = (item: AdminNavItem, pathname: string): boolean => {
  if (!item.path) return false;
  return item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
};
