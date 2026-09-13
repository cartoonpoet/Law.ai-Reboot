import type { TimelineItem, TimelineStatus } from "@lawkit/ui";
import { getStepRelation } from "./getLifecycleProgress";
import type { LifecycleProgress, LifecycleStepStateTypes } from "./getLifecycleProgress";

// 지금에 가까운 완료 단계만 펼치고, 그보다 오래된 완료 단계는 한 줄로 접는다(팝오버 높이 절약).
export const VISIBLE_DONE_STEPS = 2;

const TIMELINE_STATUS: Record<LifecycleStepStateTypes, TimelineStatus> = {
  done: "done",
  current: "current",
  todo: "upcoming",
};

/** 진행 게이지 hover 팝오버의 lawkit Timeline 항목 — 접힌 완료 단계 + 최근 완료 + 지금 + 남은 단계. */
export const toLifecycleTimeline = (progress: LifecycleProgress): TimelineItem[] => {
  const foldedCount = Math.max(0, progress.currentIndex - VISIBLE_DONE_STEPS);
  const folded: TimelineItem[] =
    foldedCount > 0
      ? [
          {
            id: "folded",
            title: `완료 ${foldedCount}단계`,
            description: progress.steps
              .slice(0, foldedCount)
              .map((s) => s.label)
              .join(" → "),
            status: "done",
          },
        ]
      : [];

  const shown = progress.steps.slice(foldedCount).map((step, k) => {
    const index = foldedCount + k;
    return {
      id: step.label,
      title: step.label,
      description: `${step.phase} · ${getStepRelation(index, progress)}`,
      status: TIMELINE_STATUS[step.state],
    };
  });

  return [...folded, ...shown];
};
