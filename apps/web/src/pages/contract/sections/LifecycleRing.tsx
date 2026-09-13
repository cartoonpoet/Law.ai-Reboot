import { useState } from "react";
import { Popover, Timeline, Tooltip } from "@lawkit/ui";
import { getStepRelation } from "../getLifecycleProgress";
import type { LifecycleProgress } from "../getLifecycleProgress";
import { toLifecycleTimeline } from "../toLifecycleTimeline";
import { cx } from "../cx";
import * as css from "./lifecycleRing.css";

interface LifecycleRingProps {
  progress: LifecycleProgress;
}

/**
 * 계약 상세 진행 게이지 — 전체 진행률 링 + 현재 단계(메인) + 10단계 막대.
 * 지난·남은 단계는 평소 숨기고, 게이지 hover/포커스 시 lawkit Popover(Timeline), 막대 hover 시 Tooltip 으로 보여준다.
 * lawkit Popover 는 클릭 토글이라 open 을 제어 모드로 두고 wrapper 의 hover/focus 로 연다.
 */
export const LifecycleRing = ({ progress }: LifecycleRingProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { currentIndex, percent, note, steps } = progress;
  const current = steps[currentIndex];
  const remaining = steps.length - 1 - currentIndex;

  return (
    <section className={css.card} aria-label="계약 진행 단계">
      <div className={css.root}>
        <Popover
          className={css.trigger}
          title={`진행 단계 ${currentIndex + 1} / ${steps.length} · 남은 ${remaining}단계`}
          placement="right"
          open={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}
          onMouseEnter={() => setIsPopoverOpen(true)}
          onMouseLeave={() => setIsPopoverOpen(false)}
          onFocus={() => setIsPopoverOpen(true)}
          onBlur={() => setIsPopoverOpen(false)}
          popoverBody={
            <div className={css.popoverBody}>
              <Timeline items={toLifecycleTimeline(progress)} />
            </div>
          }
        >
          <div className={css.ring} tabIndex={0} role="button" aria-label="전체 진행 단계 보기">
            <svg className={css.ringSvg} width={css.RING_SIZE} height={css.RING_SIZE} viewBox="0 0 104 104" aria-hidden="true">
              <circle className={css.ringTrack} cx={52} cy={52} r={css.RING_RADIUS} />
              <circle className={cx(css.ringFill, css.ringOffset[String(percent)])} cx={52} cy={52} r={css.RING_RADIUS} />
            </svg>
            <span className={css.ringCenter}>
              <b className={css.ringPercent}>{percent}%</b>
              <span className={css.ringCount}>
                {currentIndex + 1} / {steps.length} 단계
              </span>
            </span>
          </div>
        </Popover>

        <div className={css.info}>
          <span className={css.eyebrow}>
            {current.phase} · 현재 단계
            <span className={css.hint}>게이지에 마우스를 올리면 전체 단계</span>
          </span>
          <h2 key={current.label} className={css.title}>
            {current.label}
          </h2>
          <p className={css.note}>{note}</p>
          <div className={css.dots}>
            {steps.map((step, i) => (
              <Tooltip key={step.label} title={step.label} content={getStepRelation(i, progress)} placement="bottom" className={css.trigger}>
                <span className={css.dotState[step.state]} tabIndex={0} aria-label={`${step.label} · ${getStepRelation(i, progress)}`} />
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
