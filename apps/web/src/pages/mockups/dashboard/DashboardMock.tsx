import { useState } from "react";
import { Callout, Tabs } from "@lawkit/ui";
import { FocusVariant } from "./FocusVariant";
import { PipelineVariant } from "./PipelineVariant";
import { WidgetGridVariant } from "./WidgetGridVariant";
import * as css from "./dashboardMock.css";

const VARIANTS = [
  {
    value: "focus",
    label: "A. 오늘 할 일 중심",
    description:
      "개인 업무 흐름용. 통계 4칸이 곧 필터이고, 할 일 목록 하나에 D-day와 바로가기 액션을 모았습니다. AI 브리핑은 한 줄로 줄이고 오른쪽엔 일정·공지만.",
    Component: FocusVariant,
  },
  {
    value: "pipeline",
    label: "B. 파이프라인 보드",
    description:
      "법무팀 관리자용. 계약 단계별 건수를 누르면 아래 표가 그 단계로 좁혀집니다. 오른쪽엔 내가 바로 처리할 결재·배정만.",
    Component: PipelineVariant,
  },
  {
    value: "grid",
    label: "C. 위젯 그리드",
    description:
      "같은 크기 카드 6개로 나눠 훑어보는 형태. 카드마다 최대 3건 + 전체보기, 숫자는 카드 배지로만 보여 중복 통계를 없앴습니다.",
    Component: WidgetGridVariant,
  },
] as const;

/** 홈 대시보드 개편 시안 3종 — lawkit 컴포넌트 기반, AppShell 안에서 비교. */
export const DashboardMock = () => {
  const [variant, setVariant] = useState<string>("focus");
  const selected = VARIANTS.find((v) => v.value === variant) ?? VARIANTS[0];
  const { Component } = selected;

  return (
    <div className={css.page}>
      <div className={css.controls}>
        <Tabs items={VARIANTS.map(({ value, label }) => ({ value, label }))} value={variant} onChange={setVariant} size="medium" />
      </div>
      <Callout intent="info" title={selected.label}>
        {selected.description}
      </Callout>
      <Component />
    </div>
  );
};
