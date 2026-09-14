import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, DdayBadge, ListGroup, ListGroupItem, ProgressBar, StatCell, StatGrid, Widget } from "@lawkit/ui";
import type { ProgressColor, StatValueColor } from "@lawkit/ui";
import { Badge as StatusToneBadge } from "../../../components/ui/Badge";
import { AiNote } from "./AiNote";
import { DashboardHeader } from "./DashboardHeader";
import { RENEWALS, RISKS, RISK_LEVELS, RISK_LEVEL_LABEL } from "./mockDashboardData";
import type { RiskLevelTypes } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const LEVEL_STAT_COLOR: Record<RiskLevelTypes, StatValueColor> = { high: "danger", medium: "warning", low: "heading" };
const LEVEL_BADGE_COLOR: Record<RiskLevelTypes, "danger" | "warning" | "secondary"> = { high: "danger", medium: "warning", low: "secondary" };
const CATEGORY_COLORS: ProgressColor[] = ["danger", "warning", "primary", "info", "success"];

const categories = [...new Set(RISKS.map((r) => r.category))];
const CATEGORY_SEGMENTS = categories.map((category, i) => {
  const count = RISKS.filter((r) => r.category === category).length;
  return { value: (count / RISKS.length) * 100, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], label: `${category} ${count}` };
});

/**
 * D. AI 리스크 레이더 — 진행 중 계약 전체를 AI 가 매일 읽고, 위험 조항을 등급별로 모아 수정 제안과 함께 보여준다.
 * 오른쪽은 AI 가 감지한 갱신·만료 임박 계약.
 */
export const RiskRadarVariant = () => {
  const [level, setLevel] = useState<RiskLevelTypes | null>(null);
  const risks = RISKS.filter((r) => level === null || r.level === level);

  const handleToggle = (next: RiskLevelTypes) => setLevel(level === next ? null : next);
  const handleKeyDown = (next: RiskLevelTypes) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle(next);
    }
  };

  return (
    <div className={css.page}>
      <DashboardHeader />

      <Widget title="AI 리스크 레이더" extra={<AiNote>진행 중 계약 24건을 오늘 새벽 다시 읽었어요</AiNote>} flush>
        <div className={css.widgetBody}>
          <StatGrid>
            {RISK_LEVELS.map((l) => (
              <StatCell
                key={l}
                label={`리스크 ${RISK_LEVEL_LABEL[l]}`}
                value={RISKS.filter((r) => r.level === l).length}
                valueColor={LEVEL_STAT_COLOR[l]}
                active={level === l}
                role="button"
                tabIndex={0}
                aria-pressed={level === l}
                className={css.statButton}
                onClick={() => handleToggle(l)}
                onKeyDown={handleKeyDown(l)}
              />
            ))}
          </StatGrid>
          <span className={css.sectionLabel}>유형별 분포</span>
          <ProgressBar segments={CATEGORY_SEGMENTS} />
        </div>
      </Widget>

      <div className={css.mainGrid}>
        <Widget title={level ? `AI 가 찾은 리스크 · ${RISK_LEVEL_LABEL[level]}` : "AI 가 찾은 리스크"} badge={risks.length} flush>
          <ListGroup variant="flush">
            {risks.map((r) => (
              <ListGroupItem
                key={r.id}
                leading={
                  <StatusToneBadge color={LEVEL_BADGE_COLOR[r.level]} size="sm">
                    {RISK_LEVEL_LABEL[r.level]}
                  </StatusToneBadge>
                }
                trailing={
                  <Button size="small" variant="outline">
                    수정 문구 보기
                  </Button>
                }
              >
                <span className={css.taskMain}>
                  <span className={css.taskTitle}>{r.contract}</span>
                  <span className={css.taskSub}>
                    {r.category} · {r.clause}
                  </span>
                  <AiNote>{r.aiSuggestion}</AiNote>
                </span>
              </ListGroupItem>
            ))}
          </ListGroup>
        </Widget>

        <aside className={css.rail}>
          <Widget title="갱신·만료 임박 · AI 감지" badge={RENEWALS.length} flush>
            <ListGroup variant="flush">
              {RENEWALS.map((e) => (
                <ListGroupItem key={e.id} trailing={<DdayBadge date={e.due} />}>
                  <span className={css.taskMain}>
                    <span className={css.railTitle}>{e.title}</span>
                    <AiNote>{e.ai}</AiNote>
                  </span>
                </ListGroupItem>
              ))}
            </ListGroup>
          </Widget>
        </aside>
      </div>
    </div>
  );
};
