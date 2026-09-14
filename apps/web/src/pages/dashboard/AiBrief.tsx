import { Button, Icon } from "@lawkit/ui";
import { AI_BRIEF } from "./mock-data";
import * as css from "./dashboard.css";

/** AI 요약 — 오늘 챙길 일을 AI 가 추리고, 항목마다 AI 가 준비해 둔 것으로 바로 가는 액션을 붙인다. */
export const AiBrief = () => (
  <section className={css.brief} aria-label="AI 요약">
    <div className={css.briefTop}>
      <span className={css.aiLabel}>
        <Icon name="autoAwesome" size="sm" className={css.aiLabelIcon} />
        AI 요약
      </span>
      <span className={css.cardMeta}>오늘 09:30 기준</span>
    </div>
    <div className={css.briefHeadline}>{AI_BRIEF.headline}</div>
    <div className={css.briefList}>
      {AI_BRIEF.points.map((p) => (
        <div key={p.id} className={css.briefRow}>
          <span className={css.briefBar[p.tone]} />
          <span className={css.briefText}>{p.text}</span>
          <Button size="small" variant="outline" color="secondary">
            {p.action}
          </Button>
        </div>
      ))}
    </div>
  </section>
);
