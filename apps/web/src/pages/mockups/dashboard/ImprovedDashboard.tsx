import { ImprovedAiBrief } from "./ImprovedAiBrief";
import { ImprovedSideRail } from "./ImprovedSideRail";
import { ImprovedTodoPanel } from "./ImprovedTodoPanel";
import { ImprovedWorkStatus } from "./ImprovedWorkStatus";
import { TODAY_LABEL } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

/**
 * 현재 대시보드(pages/dashboard/DashboardPage) 기준 개선안 — 배치·모양은 그대로 두고
 * 불필요한 것은 빼고(머리 숫자·검토 요청 버튼, 계약 전용 파이프라인·진행 중 계약 탭, 할 일 검색·페이지네이션),
 * 업무 종류와 무관한 구성(업무 현황·내 할일)에 AI 보조를 옮겨 심었다. AI 비서는 DashboardMock 이 띄운다.
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
    <ImprovedWorkStatus />

    <div className={css.bodyGrid}>
      <ImprovedTodoPanel />
      <ImprovedSideRail />
    </div>
  </div>
);
