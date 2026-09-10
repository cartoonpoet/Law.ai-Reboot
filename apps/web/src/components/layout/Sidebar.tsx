import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import { clearTokens } from "../../api/tokens";
import { Logo } from "../ui/Logo";
import { TenantSwitcher } from "./TenantSwitcher";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";
import { useMe } from "./hooks/useMe";
import { getTenantRoleLabel } from "../../utils/tenantRoleLabel";
import * as css from "./sidebar.css";

// 메뉴를 섹션으로 그룹핑(admin 콘솔 스타일).
const SECTIONS = [
  {
    label: "개요",
    items: [{ id: "home", label: "홈", icon: "home", path: "/" }],
  },
  {
    label: "계약 관리",
    items: [
      { id: "c-request", label: "계약서 검토 요청", icon: "filePlus", path: "/contract/request" },
      { id: "c-list", label: "계약서 검토 조회", icon: "fileFind", path: "/contract/list" },
      { id: "c-signed", label: "체결 계약 조회", icon: "fileCheck", path: "/contract/signed" },
      { id: "c-expire", label: "체결계약 만료 현황", icon: "clock", path: "/contract/expire" },
    ],
  },
  {
    label: "법무 업무",
    items: [
      { id: "advice", label: "법률자문", icon: "law", path: "/advice" },
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

type NavItem = (typeof SECTIONS)[number]["items"][number];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeMembership } = useTenantSwitcher();
  const { me } = useMe();

  return (
    <aside className={css.aside}>
      <div className={css.brand}>
        <Logo size={26} />
        <div className={css.brandText}>
          Law<span className={css.brandTextDim}>.ai</span>
        </div>
      </div>

      <nav className={css.nav}>
        {SECTIONS.map((section, sectionIdx) => (
          <div key={section.label}>
            <div
              className={
                sectionIdx === 0
                  ? `${css.sectionLabel} ${css.sectionLabelFirst}`
                  : css.sectionLabel
              }
            >
              {section.label}
            </div>
            {section.items.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                location={location.pathname}
                onNavigate={navigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <TenantSwitcher />

      <div className={css.foot}>
        <div className={css.footAvatar}>{me?.name.charAt(0) ?? ""}</div>
        <div className={css.footMain}>
          <div className={css.footName}>{me?.name ?? ""}</div>
          <div className={css.footRole}>
            {activeMembership ? getTenantRoleLabel(activeMembership.role) : ""}
          </div>
        </div>
        <button
          onClick={() => {
            clearTokens();
            navigate("/login");
          }}
          className={css.footLogout}
          aria-label="로그아웃"
        >
          <Icon name="logOut" size="sm" className={css.footLogoutIcon} />
        </button>
      </div>
    </aside>
  );
}

function NavRow({
  item,
  location,
  onNavigate,
}: {
  item: NavItem;
  location: string;
  onNavigate: (path: string) => void;
}) {
  const isActive = location === item.path;
  const stateClass = isActive ? css.rowLocated : css.rowDefault;

  return (
    <button
      onClick={() => onNavigate(item.path)}
      className={`${css.row} ${stateClass}`}
    >
      <Icon name={item.icon as IconName} size="sm" className={css.icon} />
      <span className={css.label}>{item.label}</span>
    </button>
  );
}
