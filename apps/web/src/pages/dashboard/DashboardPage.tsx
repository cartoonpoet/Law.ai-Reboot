import { useNavigate } from "react-router-dom";
import { AiBrief } from "./AiBrief";
import { getTodoPath } from "./getTodoPath";
import { PipelineStrip } from "./PipelineStrip";
import { SideRail } from "./SideRail";
import { TodoPanel } from "./TodoPanel";
import { TODAY_LABEL } from "./mock-data";
import type { TodoItem } from "./mock-data";
import * as css from "./dashboard.css";

/**
 * 홈 대시보드 — AI 요약 → 업무 파이프라인 → 내 할일 | 일정·공지.
 * 사이드바에 있는 액션(검토 요청 등)은 두지 않고, 항목마다 AI 판단·준비물을 붙인다. AI 비서는 AppShell 이 모든 화면에 띄운다.
 */
export const DashboardPage = () => {
  const navigate = useNavigate();

  const handleOpenTodo = (todo: TodoItem) => {
    const path = getTodoPath(todo);
    if (path) navigate(path);
  };

  return (
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

      <AiBrief />
      <PipelineStrip />

      <div className={css.bodyGrid}>
        <TodoPanel onOpen={handleOpenTodo} />
        <SideRail />
      </div>
    </div>
  );
};
