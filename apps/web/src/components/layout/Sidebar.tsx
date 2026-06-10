import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import { T } from "../../design/tokens";

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
  const [open, setOpen] = useState<Record<string, boolean>>({ contract: true });

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
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: T.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          L
        </div>
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
  const parentActive =
    hasKids &&
    item.children.some((c) => location === c.path);

  const bg = isActive
    ? T.primary
    : parentActive
      ? "rgba(255,255,255,.06)"
      : "transparent";
  const color = isActive ? "#fff" : parentActive ? T.navyText : T.navyMuted;

  return (
    <div>
      <button
        onClick={() => {
          if (hasKids) onExpand();
          else if ("path" in item) onNavigate(item.path);
        }}
        aria-expanded={hasKids ? expanded : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "8px 10px",
          border: "none",
          cursor: "pointer",
          borderRadius: 6,
          background: bg,
          color,
          fontFamily: "Pretendard",
          fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          textAlign: "left",
          transition: "background .12s, color .12s",
        }}
      >
        <Icon
          name={item.icon as IconName}
          size="sm"
          style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.85 }}
        />
        <span style={{ flex: 1 }}>{item.label}</span>
        {hasKids && (
          <Icon
            name={expanded ? "chevronDown" : "chevronRight"}
            size="sm"
            style={{ width: 13, height: 13, opacity: 0.35 }}
          />
        )}
      </button>

      {hasKids && expanded && (
        <div style={{ margin: "1px 0 4px", paddingLeft: 10 }}>
          {item.children.map((c) => {
            const on = location === c.path;
            return (
              <button
                key={c.id}
                onClick={() => onNavigate(c.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 10px 6px 20px",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 5,
                  background: on ? `${T.primary}20` : "transparent",
                  color: on ? "#7aaaf8" : T.navyMuted,
                  fontFamily: "Pretendard",
                  fontSize: 12.5,
                  fontWeight: on ? 700 : 400,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 999,
                    background: on ? "#7aaaf8" : T.navyFaint,
                    flexShrink: 0,
                  }}
                />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
