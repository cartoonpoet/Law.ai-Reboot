import { useState } from "react";
import { Button, Icon, Tabs } from "@lawkit/ui";
import { cx } from "../../contract/cx";
import { AiNote } from "./AiNote";
import { PIPELINES } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const MAX_BAR = 26;

const DOMAIN_TABS = PIPELINES.map((p) => ({
  value: p.domain,
  label: p.domain,
  badge: p.stages.filter((s) => s.bottleneck).length || undefined,
}));

/**
 * 파이프라인(개선) — 현재 계약 검토 파이프라인 UI 그대로.
 * 업무 종류 탭만 더해 계약 외 업무도 같은 모양으로 보고(병목 수 = 탭 배지), 아래에 AI 병목 분석 한 줄 + 추천 액션.
 */
export const ImprovedPipeline = () => {
  const [domain, setDomain] = useState<string>(PIPELINES[0].domain);
  const pipeline = PIPELINES.find((p) => p.domain === domain) ?? PIPELINES[0];
  const maxCount = Math.max(...pipeline.stages.map((s) => s.count));
  const total = pipeline.stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <section className={css.card} aria-label={pipeline.title}>
      <header className={css.cardHead}>
        <span className={css.cardTitle}>
          <Icon name="fileText" size="sm" className={css.cardTitleIcon} />
          {pipeline.title}
        </span>
        <span className={css.cardMeta}>오늘 09:42 기준 · {total}건 진행 중</span>
      </header>

      <div className={css.pipelineTabs}>
        <Tabs items={DOMAIN_TABS} value={domain} onChange={setDomain} />
      </div>

      {/* key 로 탭 전환 시 다시 그려 등장 애니메이션을 재생 */}
      <div key={pipeline.domain} className={css.stageRow}>
        <span className={css.flowTrack} aria-hidden />
        {pipeline.stages.map((stage, i) => (
          <div key={stage.label} className={cx(css.stageWrap, css.stageDelayVariants[String(i)])}>
            <div className={cx(css.stage, stage.bottleneck && css.stageBottleneck[stage.tone])}>
              {stage.bottleneck && <span className={cx(css.bottleneckTag, css.countTone[stage.tone])}>병목</span>}
              <div className={css.stageLabel}>{stage.label}</div>
              <div className={css.barBox}>
                <div
                  className={cx(
                    css.barTone[stage.tone],
                    css.barHeight[String(Math.round((stage.count / maxCount) * MAX_BAR))],
                    !stage.bottleneck && css.barFaint,
                  )}
                />
              </div>
              <div className={cx(css.stageCount, css.countTone[stage.bottleneck ? stage.tone : "neutral"])}>{stage.count}</div>
              <div className={css.stageUnit}>건</div>
            </div>
            {i < pipeline.stages.length - 1 && <Icon name="chevronRight" size="sm" className={css.chevron} />}
          </div>
        ))}
      </div>

      {pipeline.ai && (
        <div className={css.pipelineAi}>
          <AiNote>{pipeline.ai.text}</AiNote>
          <Button size="small" variant="outline" color="secondary">
            {pipeline.ai.action}
          </Button>
        </div>
      )}
    </section>
  );
};
