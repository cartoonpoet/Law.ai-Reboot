import { Icon, Timeline } from "@lawkit/ui";
import * as base from "../../../contract/contractDetail.css";
import { HISTORY } from "./adviceDetailV2Data";

/** 처리 이력 — 최신이 위. */
export const AdviceHistoryCard = () => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="history" size="sm" className={base.cheadIconMuted} />
      이력
    </header>
    <div className={base.cbody}>
      <Timeline items={HISTORY} />
    </div>
  </section>
);
