import { Icon } from "@lawkit/ui";
import { cx } from "../../pages/contract/cx";
import type { AiInsight } from "./summarizeAiAnalysis";
import * as css from "./aiInsightNote.css";

interface AiInsightNoteProps {
  insight: AiInsight;
}

/** 목록 행에 붙는 AI 한 줄 — [AI] 표식 + 요약(고위험 빨강·주의 주황). 실제 AI 분석 결과만 표시한다. */
export const AiInsightNote = ({ insight }: AiInsightNoteProps) => (
  <span className={css.note}>
    <span className={css.tag}>
      <Icon name="autoAwesome" size="sm" className={css.tagIcon} />
      AI
    </span>
    <span className={cx(css.text, css.textTone[insight.tone])}>{insight.text}</span>
  </span>
);
