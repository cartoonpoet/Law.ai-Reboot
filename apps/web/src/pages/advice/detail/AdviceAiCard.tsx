import { useNavigate } from "react-router-dom";
import { Alert, Button, Icon, Skeleton } from "@lawkit/ui";
import { sparkle } from "../../../components/ui/sparkle.css";
import { useAdviceBrief } from "../hooks/useAdviceBrief";
import { parseAdviceBrief } from "./parseAdviceBrief";
import * as base from "../../contract/contractDetail.css";
import * as css from "./adviceDetail.css";

/**
 * AI 자문 도우미 — 요청이 접수될 때 서버가 만든 정리를 보여준다.
 * 검토 요지 → 핵심 쟁점(근거) → 요청자에게 확인할 점 순서.
 */
export const AdviceAiCard = ({ adviceId }: { adviceId: string }) => {
  const navigate = useNavigate();
  const { analysis, isLoading, retry, isRetrying } = useAdviceBrief(adviceId);
  const brief = analysis?.status === "succeeded" ? parseAdviceBrief(analysis.result) : null;
  const isWorking = analysis?.status === "pending" || analysis?.status === "running";

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <span key={analysis?.status ?? "none"} className={brief ? sparkle : undefined}>
          <Icon name="autoAwesome" size="sm" className={base.cheadIcon} />
        </span>
        AI 자문 도우미
        {brief && brief.issues.length > 0 && <span className={base.cheadNote}>쟁점 {brief.issues.length}개</span>}
      </header>

      <div className={`${base.cbody} ${css.aiBody}`}>
        {isLoading && <Skeleton variant="text" lines={3} />}

        {!isLoading && !analysis && <p className={css.emptyThread}>아직 AI 정리가 시작되지 않았어요.</p>}

        {isWorking && (
          <p className={css.aiStatus}>
            <Icon name="loaderCircle" size="sm" className={css.aiStatusIcon} />
            요청 내용을 읽고 정리하는 중이에요…
          </p>
        )}

        {analysis?.status === "skipped" && (
          <Alert type="info" size="small">
            AI 설정이 필요합니다.{" "}
            <button type="button" className={css.aiLink} onClick={() => navigate("/system")}>
              설정하러 가기
            </button>
          </Alert>
        )}

        {analysis?.status === "failed" && (
          <div className={css.aiFailRow}>
            <span className={css.aiStatus}>정리하지 못했어요{analysis.errorMessage ? ` · ${analysis.errorMessage}` : ""}</span>
            <Button variant="outline" color="secondary" size="small" disabled={isRetrying} onClick={retry}>
              {isRetrying ? "다시 요청 중…" : "다시 시도"}
            </Button>
          </div>
        )}

        {brief?.summary && (
          <div>
            <div className={css.sectionLabel}>검토 요지</div>
            <p className={css.aiSummary}>{brief.summary}</p>
          </div>
        )}

        {brief && brief.issues.length > 0 && (
          <div>
            <div className={css.sectionLabel}>핵심 쟁점</div>
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
        )}

        {brief && brief.checkPoints.length > 0 && (
          <div>
            <div className={css.sectionLabel}>요청자에게 확인할 점</div>
            <ul className={css.checkList}>
              {brief.checkPoints.map((point) => (
                <li key={point} className={css.checkItem}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {brief && <p className={css.aiDisclaimer}>AI 정리는 참고용이에요. 회신 전에 담당 변호사가 근거를 확인하세요.</p>}
      </div>
    </section>
  );
};
