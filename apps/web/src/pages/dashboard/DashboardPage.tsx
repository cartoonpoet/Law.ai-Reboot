import { useNavigate } from "react-router-dom";
import { AiBriefCard } from "./AiBriefCard";
import { CycleTimeCard } from "./CycleTimeCard";
import { DeadlinePanel } from "./DeadlinePanel";
import { useDashboard } from "./hooks/useDashboard";
import { PipelineStrip } from "./PipelineStrip";
import { TodoPanel } from "./TodoPanel";
import * as css from "./dashboard.css";

const formatToday = (date: Date) =>
  date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });

/**
 * 홈 대시보드 — AI 브리핑 → 계약 검토 파이프라인 → 내 할일 | 기한 임박. 모두 실제 계약·결재 데이터.
 * 사이드바에 있는 액션(검토 요청 등)은 두지 않는다. AI 비서는 AppShell 이 모든 화면에 띄운다.
 */
export const DashboardPage = () => {
  const navigate = useNavigate();
  const dashboard = useDashboard();

  return (
    <div className={css.dash}>
      <header className={css.header}>
        <div>
          <div className={css.eyebrow}>법무 대시보드</div>
          <h1 className={css.h1}>업무 요약</h1>
        </div>
        <div className={css.headerMeta}>
          <div className={css.headerDate}>{formatToday(new Date())}</div>
        </div>
      </header>

      <AiBriefCard />

      <PipelineStrip stages={dashboard.stages} isLoading={dashboard.isPipelineLoading} />

      <div className={css.bodyGrid}>
        <TodoPanel
          todos={dashboard.todos}
          insights={dashboard.insights}
          isLoading={dashboard.isTodosLoading}
          onOpen={(todo) => navigate(todo.path)}
        />
        <div className={css.rail}>
          {dashboard.canSeeStats && <CycleTimeCard />}
          <DeadlinePanel deadlines={dashboard.deadlines} isLoading={dashboard.isDeadlinesLoading} onOpen={(d) => navigate(d.path)} />
        </div>
      </div>
    </div>
  );
};
