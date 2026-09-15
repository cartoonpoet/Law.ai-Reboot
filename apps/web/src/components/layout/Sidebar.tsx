import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import { Logo } from "../ui/Logo";
import { useCommandPalette } from "../search/useCommandPalette";
import { NAV_SECTIONS } from "./navSections";
import type { NavItemTypes } from "./navSections";
import { ProfileMenu } from "./ProfileMenu";
import * as css from "./sidebar.css";

// 사이드바 — 로고 · 통합검색(Ctrl+K) · 메뉴 섹션 · 내 이름 메뉴(설정·회사 전환·로그아웃). 상단 헤더는 없다.
export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const palette = useCommandPalette();

  return (
    <aside className={css.aside}>
      <div className={css.brand}>
        <Logo size={26} />
        <div className={css.brandText}>
          Law<span className={css.brandTextDim}>.ai</span>
        </div>
      </div>

      <button type="button" className={css.searchButton} onClick={palette.open} aria-label="통합검색 열기 (Ctrl K)">
        <Icon name="search" size="sm" className={css.searchIcon} />
        <span className={css.searchLabel}>통합검색</span>
        <kbd className={css.searchKbd}>Ctrl K</kbd>
      </button>

      <nav className={css.nav}>
        {NAV_SECTIONS.map((section, sectionIdx) => (
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

      <ProfileMenu />
    </aside>
  );
}

function NavRow({
  item,
  location,
  onNavigate,
}: {
  item: NavItemTypes;
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
