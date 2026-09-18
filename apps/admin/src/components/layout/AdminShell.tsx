import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Icon, Tooltip } from "@lawkit/ui";
import { clearTokens, getEmail, getName } from "../../api/tokens";
import { useSupportOpenCount } from "../../pages/support/hooks/useSupportOpenCount";
import { ADMIN_NAV_SECTIONS, checkNavActive, type AdminNavItem } from "./adminNav";
import * as css from "./adminShell.css";

interface NavRowProps {
  item: AdminNavItem;
  pathname: string;
  badge: number | null;
  onNavigate: (path: string) => void;
}

const NavRow = ({ item, pathname, badge, onNavigate }: NavRowProps) => {
  const isActive = checkNavActive(item, pathname);
  const content = (
    <>
      <Icon name={item.icon} size="sm" className={css.icon} />
      <span className={css.label}>{item.label}</span>
      {badge !== null && badge > 0 && <span className={css.navBadge}>{badge > 99 ? "99+" : badge}</span>}
    </>
  );

  // 아직 만들지 않은 메뉴는 눌리지 않게 두고, 무엇을 기다리는지 알려 준다.
  if (!item.path) {
    return (
      <Tooltip content="준비 중이에요">
        <div className={css.rowDisabled}>{content}</div>
      </Tooltip>
    );
  }

  return (
    <button type="button" className={isActive ? css.rowActive : css.row} onClick={() => onNavigate(item.path as string)}>
      {content}
    </button>
  );
};

interface AdminShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** 관리자 콘솔 틀 — 사용자 사이트와 같은 사이드바 + 본문(상단 헤더 없음). */
export const AdminShell = ({ title, description, actions, children }: AdminShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCount } = useSupportOpenCount();
  const name = getName();
  const email = getEmail();

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <div className={css.shell}>
      <aside className={css.aside}>
        <div className={css.brand}>
          <span className={css.brandLogo}>L</span>
          <div>
            <div className={css.brandText}>
              Law<span className={css.brandTextDim}>.ai</span>
            </div>
            <div className={css.brandBadge}>Admin Console</div>
          </div>
        </div>

        <nav className={css.nav}>
          {ADMIN_NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={section.label}>
              <div className={sectionIndex === 0 ? `${css.sectionLabel} ${css.sectionLabelFirst}` : css.sectionLabel}>
                {section.label}
              </div>
              {section.items.map((item) => (
                <NavRow
                  key={item.id}
                  item={item}
                  pathname={location.pathname}
                  badge={item.id === "support" ? openCount : null}
                  onNavigate={navigate}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className={css.foot}>
          <Avatar initials={name?.[0] ?? "관"} size="sm" color="primary" />
          <div className={css.footMain}>
            <div className={css.footName}>{name ?? "관리자"}</div>
            <div className={css.footEmail}>{email}</div>
          </div>
          <button type="button" className={css.footButton} onClick={handleLogout} aria-label="로그아웃">
            <Icon name="logOut" size="sm" />
          </button>
        </div>
      </aside>

      <div className={css.main}>
        <div className={css.content}>
          <div className={css.pageHead}>
            <div className={css.titleGroup}>
              <span className={css.eyebrow}>Admin</span>
              <h1 className={css.pageTitle}>{title}</h1>
              {description && <p className={css.pageDesc}>{description}</p>}
            </div>
            {actions}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
