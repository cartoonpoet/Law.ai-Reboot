import { TODAY_LABEL, USER_NAME } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

/** 공통 머리 — 날짜와 인사만. "검토 요청" 같은 이동 액션은 사이드바에 있으므로 대시보드에 중복으로 두지 않는다. */
export const DashboardHeader = () => (
  <header className={css.header}>
    <div>
      <div className={css.eyebrow}>{TODAY_LABEL}</div>
      <h1 className={css.title}>{USER_NAME} 님, 오늘 챙길 일이에요</h1>
    </div>
  </header>
);
