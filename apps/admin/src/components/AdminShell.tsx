import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Icon, themeVars } from "@lawkit/ui";
import { getEmail, getName } from "../api/tokens";

const shell: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "240px 1fr",
  minHeight: "100vh",
  background: themeVars.color.neutralBackground,
};

const sidebar: React.CSSProperties = {
  background: "#0f172a",
  color: "#cbd5e1",
  display: "flex",
  flexDirection: "column",
  padding: "16px 12px",
  gap: 4,
  position: "sticky",
  top: 0,
  height: "100vh",
};

const brand: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px 16px",
};

const brandLogo: React.CSSProperties = {
  width: 30,
  height: 30,
  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
  borderRadius: 7,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
};

const brandText: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#f1f5f9",
};

const brandBadge: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "#93c5fd",
};

const navSection: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "#64748b",
  padding: "14px 10px 6px",
};

const navItemBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 7,
  fontSize: 13,
  color: "#cbd5e1",
  cursor: "pointer",
  textDecoration: "none",
};

const navItemActive: React.CSSProperties = {
  ...navItemBase,
  background: "rgba(59,130,246,.15)",
  color: "#fff",
  fontWeight: 600,
};

const sidebarFoot: React.CSSProperties = {
  marginTop: "auto",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px",
  borderTop: "1px solid rgba(148,163,184,.12)",
};

const sidebarFootName: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#e2e8f0",
};

const sidebarFootEmail: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
};

const main: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const topbar: React.CSSProperties = {
  height: 56,
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  background: themeVars.color.neutralSurface,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 24px",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const breadcrumb: React.CSSProperties = {
  fontSize: 13,
  color: themeVars.color.textMuted,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const content: React.CSSProperties = {
  padding: 24,
  overflowY: "auto",
};

interface NavItem {
  icon: "home" | "users" | "fileText" | "folder" | "tag" | "shield" | "monitor" | "briefcase";
  label: string;
  path?: string; // 있으면 클릭 이동 + 현재 경로 매칭으로 active
}

const isNavActive = (item: NavItem, pathname: string) =>
  item.path !== undefined &&
  (item.path === "/" ? pathname === "/" : pathname.startsWith(item.path));

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "개요",
    items: [
      { icon: "home", label: "대시보드", path: "/" },
      { icon: "briefcase", label: "고객사", path: "/tenants" },
    ],
  },
  {
    section: "관리",
    items: [
      { icon: "users", label: "사용자" },
      { icon: "fileText", label: "계약" },
      { icon: "folder", label: "표준양식" },
      { icon: "tag", label: "카테고리" },
    ],
  },
  {
    section: "감사",
    items: [
      { icon: "shield", label: "감사 로그" },
      { icon: "monitor", label: "시스템 상태" },
    ],
  },
];

interface AdminShellProps {
  breadcrumbLabel: string;
  topbarExtra?: ReactNode;
  children: ReactNode;
}

export function AdminShell({
  breadcrumbLabel,
  topbarExtra,
  children,
}: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const name = getName();
  const email = getEmail();

  return (
    <div style={shell}>
      <aside style={sidebar}>
        <div style={brand}>
          <div style={brandLogo}>L</div>
          <div>
            <div style={brandText}>Law.ai</div>
            <div style={brandBadge}>Admin Console</div>
          </div>
        </div>

        {NAV.map((group) => (
          <div key={group.section}>
            <div style={navSection}>{group.section}</div>
            {group.items.map((item) => (
              <div
                key={item.label}
                onClick={item.path ? () => navigate(item.path!) : undefined}
                style={{
                  ...(isNavActive(item, location.pathname) ? navItemActive : navItemBase),
                  ...(item.path ? { cursor: "pointer" } : {}),
                }}
              >
                <Icon name={item.icon} size="sm" />
                {item.label}
              </div>
            ))}
          </div>
        ))}

        <div style={sidebarFoot}>
          <Avatar initials={name?.[0] ?? "관"} size="sm" color="primary" />
          <div style={{ minWidth: 0 }}>
            <div style={sidebarFootName}>{name ?? "관리자"}</div>
            <div style={sidebarFootEmail}>{email}</div>
          </div>
        </div>
      </aside>

      <div style={main}>
        <header style={topbar}>
          <div style={breadcrumb}>
            <Icon name="home" size="sm" />
            <span>Admin</span>
            <span>/</span>
            <span style={{ color: themeVars.color.textHeading, fontWeight: 600 }}>
              {breadcrumbLabel}
            </span>
          </div>
          {topbarExtra}
        </header>
        <div style={content}>{children}</div>
      </div>
    </div>
  );
}
