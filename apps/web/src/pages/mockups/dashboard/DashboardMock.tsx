import { useState } from "react";
import { Callout, Switch, Tabs } from "@lawkit/ui";
import { AiAssistantDock } from "./AiAssistantDock";
import { CopilotVariant } from "./CopilotVariant";
import { DailyPlanVariant } from "./DailyPlanVariant";
import { FocusVariant } from "./FocusVariant";
import { PipelineVariant } from "./PipelineVariant";
import { RiskRadarVariant } from "./RiskRadarVariant";
import { TriageVariant } from "./TriageVariant";
import * as css from "./dashboardMock.css";

const VARIANTS = [
  {
    value: "focus",
    label: "A. 할 일 + AI 이유",
    description: "AI 브리핑 한 줄 + 통계 4칸 필터. 할 일마다 AI 가 '왜 지금인지'와 '준비해 둔 초안·추천'을 붙입니다.",
    Component: FocusVariant,
  },
  {
    value: "copilot",
    label: "B. AI 코파일럿",
    description: "맨 위가 AI 입력창. 추천 질문을 누르거나 직접 물으면 답과 바로가기가 그 자리에 뜹니다. 아래엔 AI 가 준비해 둔 일과 높은 리스크.",
    Component: CopilotVariant,
  },
  {
    value: "triage",
    label: "C. AI 트리아지",
    description: "AI 가 할 일을 '확인만 하면 끝 / 내 판단 필요 / 기다리는 중' 세 칸으로 나눕니다. 왼쪽부터 빠르게 비우는 흐름.",
    Component: TriageVariant,
  },
  {
    value: "risk",
    label: "D. AI 리스크 레이더",
    description: "진행 중 계약을 AI 가 매일 읽고 위험 조항을 등급·유형별로 모아 수정 제안과 함께 보여줍니다. 오른쪽은 갱신·만료 감지.",
    Component: RiskRadarVariant,
  },
  {
    value: "plan",
    label: "E. AI 데일리 플랜",
    description: "기한·중요도·회의를 보고 AI 가 오늘 할 순서를 시간축으로 짜 줍니다. 블록마다 AI 가 준비한 것이 붙습니다.",
    Component: DailyPlanVariant,
  },
  {
    value: "pipeline",
    label: "F. 파이프라인 + AI 병목",
    description: "법무팀 관리자용. 단계를 고르면 AI 가 병목 원인과 해법을 먼저 말하고, 표의 계약마다 AI 한 줄 판단이 붙습니다.",
    Component: PipelineVariant,
  },
] as const;

/**
 * 홈 대시보드 개편 시안 6종 + 항상 떠 있는 AI 비서(G). 모두 AI 보조형, lawkit 컴포넌트 기반.
 * AI 비서는 대시보드 안이 아니라 앱 전체에 떠 있는 요소라 스위치로 켜고 끄며 어느 시안과도 조합해 본다.
 */
export const DashboardMock = () => {
  const [variant, setVariant] = useState<string>("focus");
  const [isDockOn, setIsDockOn] = useState(true);
  const selected = VARIANTS.find((v) => v.value === variant) ?? VARIANTS[0];
  const { Component } = selected;

  return (
    <div className={css.page}>
      <div className={css.controls}>
        <div className={css.controlRow}>
          <Tabs items={VARIANTS.map(({ value, label }) => ({ value, label }))} value={variant} onChange={setVariant} size="medium" />
          <Switch label="G. 항상 떠 있는 AI 비서" checked={isDockOn} onCheckedChange={setIsDockOn} />
        </div>
      </div>
      <Callout intent="info" title={selected.label}>
        {selected.description}
        {isDockOn && " 오른쪽 아래 'AI 비서' 버튼으로 어느 화면에서든 질문하거나 일을 시킬 수 있어요."}
      </Callout>
      <Component />
      {isDockOn && <AiAssistantDock contextLabel={`대시보드 · ${selected.label}`} />}
    </div>
  );
};
