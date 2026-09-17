import { Avatar, Button, Callout, DdayBadge, Icon } from "@lawkit/ui";
import { cx } from "../../../contract/cx";
import * as base from "../../../contract/contractDetail.css";
import * as css from "../adviceDetail.css";
import { ADVICE, MOCK_TODAY } from "./adviceDetailData";

/** 우측 레일 최상단 — 지금 누가 무엇을 언제까지 해야 하는지. */
export const AdviceActionPanel = () => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="task" size="sm" className={base.cheadIconMuted} />
      처리 현황
    </header>
    <div className={`${base.cbody} ${base.stack}`}>
      <dl className={css.kvList}>
        <div className={css.kvRow}>
          <dt className={css.kvKey}>담당</dt>
          <dd className={css.kvValue}>
            <Avatar initials={ADVICE.ownerName[0]} size="sm" color="info" />
            {ADVICE.ownerName}
          </dd>
        </div>
        <div className={css.kvRow}>
          <dt className={css.kvKey}>회신 기한</dt>
          <dd className={cx(css.kvValue, css.kvValueWarn)}>
            {ADVICE.dueDate}
            <DdayBadge date={ADVICE.dueDate} today={MOCK_TODAY} />
          </dd>
        </div>
        <div className={css.kvRow}>
          <dt className={css.kvKey}>접수 후</dt>
          <dd className={css.kvValue}>영업일 3일째</dd>
        </div>
      </dl>

      <Callout intent="warning" title="기한 임박">
        {ADVICE.dueReason}. 요청자 답변이 오늘 중 없으면 기한 조정을 협의하세요.
      </Callout>

      <div className={css.actionButtons}>
        <Button variant="outline" color="secondary" size="small">
          기한 조정 요청
        </Button>
        <Button variant="outline" color="secondary" size="small">
          담당 변경
        </Button>
      </div>
    </div>
  </section>
);
