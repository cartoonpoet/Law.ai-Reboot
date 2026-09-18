import { Icon } from "@lawkit/ui";
import { cx } from "../../pages/contract/cx";
import type { AssistantViewTypes } from "./useAssistantState";
import { ASSISTANT_NAME } from "./assistantData";
import * as css from "./aiAssistant.css";
import * as noticeCss from "./assistantNotifications.css";

interface AssistantBottomNavProps {
  view: AssistantViewTypes;
  badgeLabel: string | null;
  onSelect: (view: AssistantViewTypes) => void;
}

const TABS: {
  view: AssistantViewTypes;
  label: string;
  icon: "autoAwesome" | "messageCircle" | "bell" | "helpCircle";
}[] = [
  { view: "home", label: "홈", icon: "autoAwesome" },
  { view: "chat", label: "대화", icon: "messageCircle" },
  { view: "notifications", label: "알림", icon: "bell" },
  { view: "support", label: "문의", icon: "helpCircle" },
];

/** AI 비서 하단 탭 — 홈 · 대화 · 알림(안 읽은 수) · 문의. */
export const AssistantBottomNav = ({ view, badgeLabel, onSelect }: AssistantBottomNavProps) => (
  <nav className={css.bottomNav} aria-label={`${ASSISTANT_NAME} 메뉴`}>
    {TABS.map((tab) => {
      const isActive = tab.view === view;
      return (
        <button
          key={tab.view}
          type="button"
          className={cx(css.navButton, isActive && css.navActive)}
          aria-current={isActive ? "page" : undefined}
          onClick={() => onSelect(tab.view)}
        >
          <Icon name={tab.icon} size="sm" />
          {tab.label}
          {tab.view === "notifications" && badgeLabel && <span className={noticeCss.navBadge}>{badgeLabel}</span>}
        </button>
      );
    })}
  </nav>
);
