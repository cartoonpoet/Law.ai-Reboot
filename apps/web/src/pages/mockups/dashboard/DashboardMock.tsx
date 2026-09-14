import { useState } from "react";
import { Callout, Tabs } from "@lawkit/ui";
import { DashboardPage } from "../../dashboard/DashboardPage";
import { AiAssistantDock } from "./AiAssistantDock";
import { ImprovedDashboard } from "./ImprovedDashboard";
import * as css from "./dashboardMock.css";

const VIEWS = [
  { value: "improved", label: "개선안" },
  { value: "current", label: "현재" },
];

/** 홈 대시보드 개선 시안 — 현재 화면과 개선안을 탭으로 바로 비교. 개선안에는 항상 떠 있는 AI 비서를 함께 띄운다. */
export const DashboardMock = () => {
  const [view, setView] = useState("improved");
  const isImproved = view === "improved";

  return (
    <div className={css.page}>
      <div className={css.controls}>
        <Tabs items={VIEWS} value={view} onChange={setView} size="medium" />
      </div>

      {isImproved ? (
        <Callout intent="info" title="현재 대시보드 기준 개선안">
          <ul className={css.changeList}>
            <li>뺀 것 — 상단 숫자·검토 요청 버튼(사이드바와 중복), 계약 전용 파이프라인·진행 중 계약 탭, 할 일 검색창·페이지네이션</li>
            <li>업무 종류와 무관하게 — 업무 현황(계약·자문·송무·인감·지식재산 한 줄씩), 내 할일(모든 업무를 기한순 한 목록). 기능이 늘면 줄만 추가</li>
            <li>AI 보조 — AI 요약은 항목별 바로 처리 버튼, 업무 현황·할 일·일정마다 AI 한 줄(왜 지금 · 준비된 것)</li>
            <li>AI 비서 — 오른쪽 아래 버튼으로 어느 화면에서든 질문하거나 일을 시킴(실행 전 확인)</li>
          </ul>
        </Callout>
      ) : (
        <Callout intent="info" title="현재 대시보드">
          지금 운영 중인 화면 그대로입니다.
        </Callout>
      )}

      {isImproved ? <ImprovedDashboard /> : <DashboardPage />}
      {isImproved && <AiAssistantDock contextLabel="대시보드" />}
    </div>
  );
};
