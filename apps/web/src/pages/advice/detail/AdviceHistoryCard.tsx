import { Icon, Timeline } from "@lawkit/ui";
import type { AdviceResponse } from "@lawai/contracts";
import { toAdviceHistory } from "./toAdviceHistory";
import * as base from "../../contract/contractDetail.css";

/** 처리 이력 — 최신이 위. */
export const AdviceHistoryCard = ({ advice }: { advice: AdviceResponse }) => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="history" size="sm" className={base.cheadIconMuted} />
      이력
    </header>
    <div className={base.cbody}>
      <Timeline items={toAdviceHistory(advice)} />
    </div>
  </section>
);
