import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import { clearTokens } from "../../api/tokens";
import { Logo } from "../ui/Logo";
import * as css from "./sidebar.css";

// 메뉴를 섹션으로 그룹핑(admin 콘솔 스타일). 계약은 하위 라우트 확장 유지.
const SECTIONS = [
  {
    label: "개요",
    items: [{ id: "home", label: "홈", icon: "home", path: "/" }],
  },
  {
    label: "계약 관리",
    items: [
      {
        id: "contract",
        label: "계약",
        icon: "fileText",
        children: [
          { id: "c-request", label: "계약서 검토 요청", path: "/contract/request" },
          { id: "c-list", label: "계약서 검토 조회", path: "/contract/list" },
          { id: "c-signed", label: "체결 계약 조회", path: "/contract/signed" },
          { id: "c-expire", label: "체결계약 만료 현황", path: "/contract/expire" },
        ],
      },
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
      { id: "system", label: "시스템 관리", icon: "settings", path: "/system" },
    ],
  },
] as const;

type NavItem = (typeof SECTIONS)[number]["items"][number];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});

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
                expanded={!!open[item.id]}
                onExpand={() => setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))}
                onNavigate={navigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className={css.foot}>
        <div className={css.footAvatar}>손</div>
        <div className={css.footMain}>
          <div className={css.footName}>손준호</div>
          <div className={css.footRole}>법무팀</div>
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
  expanded,
  onExpand,
  onNavigate,
}: {
  item: NavItem;
  location: string;
  expanded: boolean;
  onExpand: () => void;
  onNavigate: (path: string) => void;
}) {
  const hasKids = "children" in item && !!item.children;
  const isActive = !hasKids && "path" in item && location === item.path;
  // 현재 위치(located): 자식 라우트가 현재 경로면 그 그룹이 "여기"
  const parentHere =
    hasKids && item.children.some((c) => location === c.path);

  // 상태 우선순위: 위치(located/here) > 펼쳐서 보는 중(viewing) > 기본
  const stateClass = isActive
    ? css.rowLocated
    : parentHere
      ? css.rowHere
      : hasKids && expanded
        ? css.rowViewing
        : css.rowDefault;

  return (
    <div>
      <button
        onClick={() => {
          if (hasKids) onExpand();
          else if ("path" in item) onNavigate(item.path);
        }}
        aria-expanded={hasKids ? expanded : undefined}
        className={`${css.row} ${stateClass}`}
      >
        <Icon name={item.icon as IconName} size="sm" className={css.icon} />
        <span className={css.label}>{item.label}</span>
        {hasKids && (
          <Icon
            name="chevronRight"
            size="sm"
            className={expanded ? `${css.chevron} ${css.chevronOpen}` : css.chevron}
          />
        )}
      </button>

      {hasKids && (
        <div className={expanded ? `${css.subWrap} ${css.subWrapOpen}` : css.subWrap}>
          <div className={css.subInner}>
            <div className={css.subList}>
              {item.children.map((c) => {
                const on = location === c.path;
                return (
                  <button
                    key={c.id}
                    onClick={() => onNavigate(c.path)}
                    className={on ? `${css.sub} ${css.subOn}` : css.sub}
                  >
                    <span className={on ? `${css.dot} ${css.dotOn}` : css.dot} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
