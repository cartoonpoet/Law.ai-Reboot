import type { ReactNode } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Spinner } from "@lawkit/ui";
import type { MyProfile } from "@lawai/contracts";
import { useMe } from "../../components/layout/hooks/useMe";
import { cx } from "../contract/cx";
import { CompaniesSection } from "./sections/CompaniesSection";
import { NotificationSection } from "./sections/NotificationSection";
import { PasswordSection } from "./sections/PasswordSection";
import { ProfileSection } from "./sections/ProfileSection";
import { DEFAULT_SETTINGS_TAB, SETTINGS_TABS, toSettingsTab } from "./settingsTabs";
import type { SettingsTabTypes } from "./settingsTabs";
import * as css from "./settings.css";

const renderSection = (tab: SettingsTabTypes, me: MyProfile): ReactNode => {
  const SECTIONS: Record<SettingsTabTypes, ReactNode> = {
    profile: <ProfileSection me={me} />,
    notifications: <NotificationSection me={me} />,
    password: <PasswordSection />,
    companies: <CompaniesSection />,
  };
  return SECTIONS[tab];
};

/**
 * 내 정보 설정(/settings/:tab) — 왼쪽 탭(내 정보·알림·비밀번호·소속 회사) + 오른쪽 내용.
 * 내 계정에만 적용되는 개인 설정이다. 서비스 전체 설정은 시스템 관리(/system).
 */
export const SettingsPage = () => {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { me } = useMe();
  const activeTab = toSettingsTab(tab);

  if (!activeTab) return <Navigate to={`/settings/${DEFAULT_SETTINGS_TAB}`} replace />;

  return (
    <div className={css.page}>
      <header className={css.head}>
        <h1 className={css.title}>내 정보 설정</h1>
        <p className={css.sub}>내 계정에만 적용돼요. 서비스 전체 설정은 사이드바의 시스템 관리에서 해요.</p>
      </header>

      <div className={css.split}>
        <nav className={css.tabs} aria-label="설정 항목">
          {SETTINGS_TABS.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                className={cx(css.tab, isActive && css.tabActive)}
                aria-current={isActive ? "page" : undefined}
                onClick={() => navigate(`/settings/${item.id}`)}
              >
                {item.label}
                <span className={css.tabHint}>{item.hint}</span>
              </button>
            );
          })}
        </nav>

        <div>{me ? renderSection(activeTab, me) : <Spinner label="불러오는 중..." />}</div>
      </div>
    </div>
  );
};
