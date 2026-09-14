import { Icon } from "@lawkit/ui";
import { Tag } from "../../../components/ui/Tag";
import { cx } from "../../contract/cx";
import { AiNote } from "./AiNote";
import { DOMAIN_TAG_COLOR, WORK_STATUS } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

/**
 * 업무 현황 — 계약 전용 파이프라인 대신 법무 업무 전체를 한 줄씩.
 * 업무 종류(자문·송무·인감·지식재산 등)가 늘어도 줄만 추가되고, 막힌 단계·AI 판단은 줄마다 붙는다.
 */
export const ImprovedWorkStatus = () => (
  <section className={css.card} aria-label="업무 현황">
    <header className={css.cardHead}>
      <span className={css.cardTitle}>
        <Icon name="factCheck" size="sm" className={css.cardTitleIcon} />
        업무 현황
      </span>
      <span className={css.cardMeta}>오늘 09:42 기준 · 진행 중 {WORK_STATUS.reduce((sum, d) => sum + d.stages.reduce((s, st) => s + st.count, 0), 0)}건</span>
    </header>

    {WORK_STATUS.map((domain) => (
      <div key={domain.domain} className={css.statusRow}>
        <div className={css.statusDomain}>
          <Tag color={DOMAIN_TAG_COLOR[domain.domain]}>{domain.domain}</Tag>
          <span className={css.statusTotal}>{domain.stages.reduce((s, st) => s + st.count, 0)}건</span>
        </div>
        <div className={css.statusMain}>
          <div className={css.statusStages}>
            {domain.stages.map((stage, i) => (
              <span key={stage.label} className={css.statusStageWrap}>
                <span className={cx(css.stageChip, css.stageChipTone[stage.tone])}>
                  {stage.label}
                  <span className={css.stageChipCount}>{stage.count}</span>
                </span>
                {i < domain.stages.length - 1 && <Icon name="chevronRight" size="sm" className={css.chevron} />}
              </span>
            ))}
          </div>
          {domain.ai && <AiNote>{domain.ai}</AiNote>}
        </div>
      </div>
    ))}
  </section>
);
