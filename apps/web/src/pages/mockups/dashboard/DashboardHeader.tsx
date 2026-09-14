import { Button, Icon } from "@lawkit/ui";
import { TODAY_LABEL, USER_NAME } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

/** 공통 머리 — 인사·날짜 + 주요 액션 하나(검토 요청). 처리 대기/기한 숫자는 본문 통계로 옮겨 중복을 없앴다. */
export const DashboardHeader = () => (
  <header className={css.header}>
    <div>
      <div className={css.eyebrow}>{TODAY_LABEL}</div>
      <h1 className={css.title}>{USER_NAME} 님, 오늘 챙길 일이에요</h1>
    </div>
    <Button size="medium" iconLeft={<Icon name="contractEdit" size="sm" />}>
      검토 요청
    </Button>
  </header>
);
