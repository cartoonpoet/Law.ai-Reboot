import { Button, Icon } from "@lawkit/ui";
import * as base from "../../../contract/contractDetail.css";
import * as css from "../adviceDetail.css";
import { AI_ISSUES, AI_SUMMARY, SIMILAR_ADVICES } from "./adviceDetailData";

/** AI 자문 도우미 — 요지(결론) → 쟁점과 근거 → 지난 자문 순으로 읽히게 위계를 둔다. */
export const AdviceAiCard = () => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="autoAwesome" size="sm" className={base.cheadIcon} />
      AI 자문 도우미
      <span className={base.cheadNote}>09.14 요청 내용 기준 분석</span>
    </header>
    <div className={`${base.cbody} ${css.cardBodyStack}`}>
      <div>
        <div className={css.sectionLabel}>검토 요지</div>
        <p className={css.aiSummary}>{AI_SUMMARY}</p>
      </div>

      <div>
        <div className={css.sectionLabel}>
          핵심 쟁점 <span className={css.sectionCount}>{AI_ISSUES.length}</span>
        </div>
        <ol className={css.issueList}>
          {AI_ISSUES.map((issue, i) => (
            <li key={issue.id} className={css.issueItem}>
              <span className={css.issueNum}>쟁점 {i + 1}</span>
              <span className={css.issueTitle}>{issue.title}</span>
              <span className={css.issueBasis}>{issue.basis}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <div className={css.sectionLabel}>
          비슷한 지난 자문 <span className={css.sectionCount}>{SIMILAR_ADVICES.length}</span>
        </div>
        <ul className={css.similarList}>
          {SIMILAR_ADVICES.map((advice) => (
            <li key={advice.id} className={css.similarRow}>
              <span className={css.similarCode}>{advice.code}</span>
              <span>
                <span className={css.similarTitle}>{advice.title}</span>
                <span className={css.similarConclusion}>회신 결론 · {advice.conclusion}</span>
              </span>
              <span className={css.similarDate}>{advice.answeredAt} 회신</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={css.aiFooter}>
        <span className={css.aiDisclaimer}>AI 분석은 참고용입니다. 회신 전 담당 변호사가 근거를 확인하세요.</span>
        <Button variant="outline" color="secondary" size="small">
          회신 초안에 반영
        </Button>
      </div>
    </div>
  </section>
);
