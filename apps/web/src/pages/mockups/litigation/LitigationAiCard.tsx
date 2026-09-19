import { Icon } from "@lawkit/ui";
import { sparkle } from "../../../components/ui/sparkle.css";
import { MOCK_CASE_BRIEF } from "./litigationMockData";
import * as base from "../../contract/contractDetail.css";
import * as css from "./litigationMock.css";

/**
 * 로아이 사건 도우미 — 자문 상세의 AI 카드와 같은 구성.
 * 검토 요지 → 핵심 쟁점(근거) → 확인할 점 → 면책 한 줄.
 */
export const LitigationAiCard = () => {
  const brief = MOCK_CASE_BRIEF;

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <span className={sparkle}>
          <Icon name="autoAwesome" size="sm" className={base.cheadIcon} />
        </span>
        로아이 사건 도우미
        <span className={base.cheadNote}>쟁점 {brief.issues.length}개</span>
      </header>

      <div className={`${base.cbody} ${css.aiBody}`}>
        <div>
          <div className={css.aiSectionLabel}>검토 요지</div>
          <p className={css.aiSummary}>{brief.summary}</p>
        </div>

        <div>
          <div className={css.aiSectionLabel}>핵심 쟁점</div>
          <ol className={css.issueList}>
            {brief.issues.map((issue, index) => (
              <li key={issue.title} className={css.issueItem}>
                <span className={css.issueNum}>쟁점 {index + 1}</span>
                <span className={css.issueTitle}>{issue.title}</span>
                <span className={css.issueBasis}>{issue.basis}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className={css.aiSectionLabel}>확인할 점</div>
          <ul className={css.checkList}>
            {brief.checkPoints.map((point) => (
              <li key={point} className={css.checkItem}>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className={css.aiDisclaimer}>AI 정리는 참고용이에요. 서면을 내기 전에 담당 변호사가 근거를 확인하세요.</p>
      </div>
    </section>
  );
};
