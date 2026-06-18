import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Logo } from "../ui/Logo";
import * as css from "./sidebar.css";

const NAV = [
  { id: "home",         label: "홈",             icon: "home",         path: "/" },
  { id: "contract",     label: "계약",            icon: "fileText",     children: [
    { id: "c-request",  label: "계약서 검토 요청", path: "/contract/request" },
    { id: "c-list",     label: "계약서 검토 조회", path: "/contract/list" },
    { id: "c-signed",   label: "체결 계약 조회",   path: "/contract/signed" },
    { id: "c-expire",   label: "체결계약 만료 현황", path: "/contract/expire" },
  ]},
  { id: "advice",       label: "법률자문",         icon: "law",          path: "/advice" },
  { id: "litigation",   label: "송무",             icon: "litigation",   path: "/litigation" },
  { id: "seal",         label: "인감 사용 신청",    icon: "seal",         path: "/seal" },
  { id: "ip",           label: "지식재산권",        icon: "iPRs",         path: "/ip" },
  { id: "ai",           label: "AI 분석",          icon: "aI",           path: "/ai" },
  { id: "doc",          label: "문서관리",          icon: "folder",       path: "/doc" },
  { id: "system",       label: "시스템 관리",       icon: "settings",     path: "/system" },
] as const;

type NavItem = (typeof NAV)[number];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <aside
      style={{
        width: 232,
        flexShrink: 0,
        background: T.navy,
        borderRight: `1px solid ${T.navyLine}`,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
      }}
    >
      <div
        style={{
          padding: "18px 16px 14px",
          borderBottom: `1px solid ${T.navyLine}`,
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <Logo size={26} />
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#fff",
          }}
        >
          Law<span style={{ opacity: 0.45 }}>.ai</span>
        </div>
      </div>

      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {NAV.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            location={location.pathname}
            expanded={!!open[item.id]}
            onExpand={() =>
              setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))
            }
            onNavigate={navigate}
          />
        ))}
      </nav>

      <div
        style={{
          padding: "12px 14px",
          borderTop: `1px solid ${T.navyLine}`,
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: T.primary,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          손
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.navyText }}>
            손준호
          </div>
          <div style={{ fontSize: 11, color: T.navyMuted, marginTop: 1 }}>
            법무팀
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
          }}
          aria-label="로그아웃"
        >
          <Icon
            name="logOut"
            size="sm"
            style={{ width: 15, height: 15, color: T.navyFaint }}
          />
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
  const parentHere = hasKids && item.children.some((c) => location === c.path);

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
          <Icon name="chevronRight" size="sm" className={expanded ? `${css.chevron} ${css.chevronOpen}` : css.chevron} />
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
