import { ImprovedAiBrief } from "./ImprovedAiBrief";
import { ImprovedPipeline } from "./ImprovedPipeline";
import { ImprovedSideRail } from "./ImprovedSideRail";
import { ImprovedTodoPanel } from "./ImprovedTodoPanel";
import { TODAY_LABEL } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

/**
 * 현재 대시보드(pages/dashboard/DashboardPage) 기준 개선안 — 배치·모양은 그대로 두고
 * 불필요한 것은 빼고(머리의 처리 대기·기한 임박 숫자와 검토 요청 버튼, 할 일 검색·페이지네이션),
 * AI 보조(항목별 AI 한 줄·바로 처리 액션·병목 분석)를 옮겨 심었다. AI 비서는 DashboardMock 이 띄운다.
 */
export const ImprovedDashboard = () => (
  <div className={css.dash}>
    <header className={css.header}>
      <div>
        <div className={css.eyebrow}>법무 대시보드</div>
        <h1 className={css.h1}>업무 요약</h1>
      </div>
      <div className={css.headerMeta}>
        <div className={css.headerDate}>{TODAY_LABEL}</div>
        <div className={css.headerSync}>마지막 동기화 09:42</div>
      </div>
    </header>

    <ImprovedAiBrief />
    <ImprovedPipeline />

    <div className={css.bodyGrid}>
      <ImprovedTodoPanel />
      <ImprovedSideRail />
    </div>
  </div>
);
