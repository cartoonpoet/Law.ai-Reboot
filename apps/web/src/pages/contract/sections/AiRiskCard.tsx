import { useNavigate } from "react-router-dom";
import type { ContractStatus } from "@lawai/contracts";
import { Icon, Button, Skeleton, Alert } from "@lawkit/ui";
import { parseAiResult } from "../../../components/ai/parseAiResult";
import type { AiResultRisk, AiRiskLevelTypes } from "../../../components/ai/parseAiResult";
import { getActiveAiKind } from "../getActiveAiKind";
import { useAiAnalysis } from "../hooks/useAiAnalysis";
import { useRetryAiAnalysis } from "../hooks/useRetryAiAnalysis";
import { cx } from "../cx";
import { sparkle } from "../../../components/ui/sparkle.css";
import * as css from "../contractDetail.css";

/* =========================================================================
 * AiRiskCard — "AI 계약 리스크" 카드(실동작). 상태(status)에서 파생한 kind 로
 * useAiAnalysis 를 폴링하고, AiAnalysisDto.status(pending/running/succeeded/
 * failed/skipped) 에 따라 분기 렌더한다. 결과 해석은 components/ai/parseAiResult 공용.
 * ======================================================================= */

// ai-service KIND_PROMPT 의 level("low"|"medium"|"high") → 기존 리스크 카드 CSS 변형 키.
const RISK_LEVEL_TO_CSS: Record<AiRiskLevelTypes, "high" | "mid" | "low"> = {
  high: "high",
  medium: "mid",
  low: "low",
};
const RISK_LEVEL_LABEL: Record<AiRiskLevelTypes, string> = {
  high: "고위험",
  medium: "주의",
  low: "참고",
};

function AiResultRiskCard({ risk }: { risk: AiResultRisk }) {
  const level = RISK_LEVEL_TO_CSS[risk.level];
  return (
    <div className={css.risk}>
      <div className={css.riskHead}>
        <span className={cx(css.rbadge, css.rbadgeLevel[level])}>
          {RISK_LEVEL_LABEL[risk.level]}
        </span>
        <span className={css.riskClause}>{risk.clause}</span>
      </div>
      <div className={css.riskFinding}>{risk.finding}</div>
    </div>
  );
}

interface AiRiskCardProps {
  contractId: string;
  status: ContractStatus;
}

export function AiRiskCard({ contractId, status }: AiRiskCardProps) {
  const navigate = useNavigate();
  const kind = getActiveAiKind(status);
  const { analysis, isLoading } = useAiAnalysis(contractId, kind);
  const { retry, isRetrying } = useRetryAiAnalysis(contractId, kind);

  const parsed = analysis?.status === "succeeded" ? parseAiResult(analysis.result) : null;
  const highCount = parsed?.risks.filter((r) => r.level === "high").length ?? 0;

  return (
    <section className={css.card}>
      <header className={css.chead}>
        <span key={analysis?.status ?? "none"} className={parsed ? sparkle : undefined}>
          <Icon name="autoAwesome" size="sm" className={css.cheadIcon} />
        </span>
        AI 계약 리스크
        {parsed && parsed.risks.length > 0 && (
          <span className={css.riskCount}>
            <b className={css.riskCountHigh}>고위험 {highCount}</b> · 총 {parsed.risks.length}건 감지
          </span>
        )}
      </header>
      <div className={cx(css.cbody, css.stack)}>
        {kind === null && (
          <p className={css.blockEmpty}>이 단계에서는 AI 분석을 제공하지 않습니다.</p>
        )}

        {kind !== null && isLoading && <Skeleton variant="text" lines={3} />}

        {kind !== null && !isLoading && !analysis && (
          <p className={css.blockEmpty}>아직 AI 분석이 시작되지 않았습니다.</p>
        )}

        {(analysis?.status === "pending" || analysis?.status === "running") && (
          <div className={css.docGroupLabel}>
            <Icon name="loaderCircle" size="sm" className={css.noteIcon} />
            AI 분석 진행 중입니다…
          </div>
        )}

        {analysis?.status === "skipped" && (
          <Alert type="info" size="small">
            AI 설정이 필요합니다.{" "}
            <button type="button" className={css.flink} onClick={() => navigate("/system")}>
              설정하러 가기
            </button>
          </Alert>
        )}

        {analysis?.status === "failed" && (
          <div className={css.actionStatusRow}>
            <span className={css.docGroupLabel}>
              분석 실패{analysis.errorMessage ? ` · ${analysis.errorMessage}` : ""}
            </span>
            <Button
              type="button"
              variant="outline"
              color="secondary"
              size="small"
              disabled={isRetrying}
              iconLeft={<Icon name="refreshCw" size="sm" className={css.btnIcon} />}
              onClick={retry}
            >
              다시 시도
            </Button>
          </div>
        )}

        {parsed && (
          <>
            {parsed.summary && <p className={css.rbtxt}>{parsed.summary}</p>}
            {parsed.risks.map((r, i) => (
              <AiResultRiskCard key={i} risk={r} />
            ))}
            {parsed.keyFacts.map((f, i) => (
              <div key={i} className={css.akv}>
                <span className={css.akvKey}>{f.label}</span>
                <span className={css.akvValue}>{f.value}</span>
              </div>
            ))}
            {parsed.risks.length === 0 && parsed.keyFacts.length === 0 && !parsed.summary && (
              <p className={css.blockEmpty}>분석 결과가 없습니다.</p>
            )}
            <div className={css.docGroupLabel}>
              <Icon name="info" size="sm" className={css.noteIcon} />
              AI가 표준계약서·과거 검토 이력과 대조해 분석한 결과입니다. 최종 판단은 검토자에게 있습니다.
            </div>
          </>
        )}
      </div>
    </section>
  );
}
