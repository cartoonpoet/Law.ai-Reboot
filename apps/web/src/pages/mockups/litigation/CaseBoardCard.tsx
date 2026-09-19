import { Button, DdayBadge, Icon } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { StageRow } from "./StageRow";
import {
  SIDE_LABEL,
  formatDate,
  formatMoney,
  type CaseStatusTypes,
  type MockCase,
} from "./litigationMockData";
import * as base from "../../contract/contractDetail.css";
import * as css from "./litigationMock.css";

const STATUS_COLOR: Record<CaseStatusTypes, "secondary" | "primary" | "warning" | "success"> = {
  준비: "secondary",
  진행: "primary",
  선고: "warning",
  종결: "success",
};

interface CaseBoardCardProps {
  item: MockCase;
}

/** B안 카드 한 장 — 카드 머리는 자문 상세처럼 아이콘 + 제목, 몸통은 계약 상세의 facts 격자를 쓴다. */
export const CaseBoardCard = ({ item }: CaseBoardCardProps) => {
  const next = item.nextHearing;

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="litigation" size="sm" className={base.cheadIconMuted} />
        <span className={css.cheadTitle}>{item.name}</span>
        <span className={css.cheadBadge}>
          <Badge color={STATUS_COLOR[item.status]} size="sm" dot>
            {item.status}
          </Badge>
        </span>
        <span className={base.cheadNote}>
          {item.caseNo} · {item.courtName}
        </span>
      </header>

      <div className={base.cbody}>
        <div className={css.boardBody}>
          <div className={css.dateBox}>
            {next ? (
              <>
                <span className={css.dateBoxSub}>{Number(next.date.split("-")[1])}월</span>
                <span className={css.dateBoxDay}>{Number(next.date.split("-")[2])}</span>
                <span className={css.dateBoxSub}>{next.time}</span>
              </>
            ) : (
              <span className={css.dateBoxEmpty}>기일 없음</span>
            )}
          </div>

          <div className={css.boardMain}>
            {next ? (
              <div className={css.hearingMain}>
                <span className={css.cellRow}>
                  <span className={css.hearingTitle}>{next.kind}</span>
                  <DdayBadge date={next.date} />
                </span>
                <span className={css.meta}>
                  {formatDate(next.date)} {next.time} · {next.place} · 참석 {next.attendee}
                </span>
              </div>
            ) : (
              <span className={css.meta}>잡힌 기일이 없습니다.</span>
            )}

            <div className={`${base.facts} ${css.boardFacts}`}>
              <div className={base.fact}>
                <div className={base.fl}>우리 지위</div>
                <div className={base.fv}>
                  {SIDE_LABEL[item.side]} · 상대 {item.opponent}
                </div>
              </div>
              <div className={base.fact}>
                <div className={base.fl}>소가</div>
                <div className={base.fv}>{formatMoney(item.amount)}</div>
              </div>
              <div className={base.fact}>
                <div className={base.fl}>담당</div>
                <div className={base.fv}>
                  {item.ownerName} · {item.firmName ?? "외부 선임 없음"}
                </div>
              </div>
            </div>

            {item.todo && (
              <p className={css.todoRow}>
                <Icon name="clock" size="sm" className={css.todoIcon} />
                낼 서면: {item.todo}
              </p>
            )}

            <p className={css.aiRow}>
              <Icon name="autoAwesome" size="sm" className={css.aiIcon} />
              <span className={css.aiText}>{item.aiLine}</span>
            </p>

            <StageRow current={item.stage} />
          </div>

          <div className={css.boardActions}>
            <Button size="small" variant="outline" color="secondary">
              사건 열기
            </Button>
            <Button size="small" variant="outline" color="secondary">
              기일 추가
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
