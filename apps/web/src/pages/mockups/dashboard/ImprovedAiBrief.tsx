import { Button, Icon } from "@lawkit/ui";
import { AI_BRIEF } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

/**
 * AI 요약(개선) — 현재 카드 모양은 그대로. 요약 아래 공통 버튼 3개(무엇에 대한 버튼인지 모호)를 없애고,
 * 항목마다 AI 가 준비한 것으로 바로 가는 액션을 붙였다.
 */
export const ImprovedAiBrief = () => (
  <section className={css.brief} aria-label="AI 요약">
    <div className={css.briefTop}>
      <span className={css.aiLabel}>
        <Icon name="autoAwesome" size="sm" className={css.aiIcon} />
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
