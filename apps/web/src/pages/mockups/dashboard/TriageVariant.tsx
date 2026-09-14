import { Button, Callout, DdayBadge, Icon, Widget } from "@lawkit/ui";
import { AiNote } from "./AiNote";
import { DashboardHeader } from "./DashboardHeader";
import { TRIAGE_LANES } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const TOTAL = TRIAGE_LANES.reduce((sum, lane) => sum + lane.cards.length, 0);
const SUMMARY = TRIAGE_LANES.map((lane) => `${lane.title} ${lane.cards.length}건`).join(" · ");

/**
 * C. AI 트리아지 보드 — AI 가 할 일을 "확인만 하면 끝 / 내 판단 필요 / 기다리는 중" 세 칸으로 나눠 준다.
 * 사람은 왼쪽(확인만)부터 빠르게 비우고, 가운데(판단)에 시간을 쓰는 흐름.
 */
export const TriageVariant = () => (
  <div className={css.page}>
    <DashboardHeader />

    <Callout intent="info" title={`AI 가 할 일 ${TOTAL}건을 분류했어요`} icon={<Icon name="autoAwesome" size="sm" />}>
      {SUMMARY}. 왼쪽 칸은 초안·추천이 끝나 있어 확인만 하면 돼요.
    </Callout>

    <div className={css.laneGrid}>
      {TRIAGE_LANES.map((lane) => (
        <Widget key={lane.key} title={lane.title} badge={lane.cards.length} flush>
          <div className={css.laneBody}>
            <p className={css.laneDesc}>{lane.description}</p>
            {lane.cards.map((card) => (
              <div key={card.id} className={css.card}>
                <span className={css.taskTitle}>{card.title}</span>
                <span className={css.taskSub}>{card.sub}</span>
                <AiNote>{card.ai}</AiNote>
                <div className={css.cardFoot}>
                  <DdayBadge date={card.due} />
                  <Button size="small" variant={lane.key === "ready" ? "default" : "outline"}>
                    {card.action}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Widget>
      ))}
    </div>
  </div>
);
