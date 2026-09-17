import { Avatar, Button, Callout, DdayBadge, Icon } from "@lawkit/ui";
import type { AdviceResponse } from "@lawai/contracts";
import { getDaysLeft, getElapsedDays } from "../getDaysLeft";
import * as base from "../../contract/contractDetail.css";
import * as css from "./adviceDetail.css";

// 기한 임박 안내를 띄우는 남은 일수.
const DUE_SOON_DAYS = 2;

interface AdviceActionPanelProps {
  advice: AdviceResponse;
  now: Date;
  isAssigning: boolean;
  isClosing: boolean;
  isResubmitting: boolean;
  onAssignClick: () => void;
  onClose: () => void;
  onResubmitClick: () => void;
}

/** 우측 레일 최상단 — 지금 누가 무엇을 언제까지 해야 하는지와 그에 맞는 동작. */
export const AdviceActionPanel = ({
  advice,
  now,
  isAssigning,
  isClosing,
  isResubmitting,
  onAssignClick,
  onClose,
  onResubmitClick,
}: AdviceActionPanelProps) => {
  const isOpen = advice.status !== "answered" && advice.status !== "closed";
  const daysLeft = isOpen ? getDaysLeft(advice.dueDate, now) : null;
  const elapsedDays = getElapsedDays(advice.createdAt, now);
  const { canAssign, canClose, canResubmitRequest } = advice.permissions;

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="task" size="sm" className={base.cheadIconMuted} />
        처리 현황
      </header>
      <div className={`${base.cbody} ${css.panelBody}`}>
        <dl className={css.kvList}>
          <div className={css.kvRow}>
            <dt className={css.kvKey}>담당</dt>
            <dd className={css.kvValue}>
              {advice.owner ? (
                <>
                  <Avatar initials={(advice.owner.name ?? "?")[0]} size="sm" color="info" />
                  {advice.owner.name ?? "-"}
                </>
              ) : (
                <span className={css.kvValueMuted}>미배정</span>
              )}
            </dd>
          </div>
          <div className={css.kvRow}>
            <dt className={css.kvKey}>회신 기한</dt>
            <dd className={css.kvValue}>
              {advice.dueDate ? advice.dueDate.slice(0, 10) : "-"}
              {advice.dueDate && isOpen && <DdayBadge date={advice.dueDate.slice(0, 10)} />}
            </dd>
          </div>
          <div className={css.kvRow}>
            <dt className={css.kvKey}>접수 후</dt>
            <dd className={css.kvValue}>{elapsedDays === 0 ? "오늘 접수" : `${elapsedDays}일째`}</dd>
          </div>
        </dl>

        {daysLeft !== null && daysLeft <= DUE_SOON_DAYS && (
          <Callout intent="warning" title={daysLeft < 0 ? "회신 기한 지남" : "회신 기한 임박"}>
            {advice.status === "waitingRequester"
              ? "요청자 답변을 기다리는 중이에요. 늦어지면 기한 조정을 협의하세요."
              : "기한 안에 회신하기 어렵다면 요청자와 기한을 협의하세요."}
          </Callout>
        )}

        {advice.status === "requestRejected" && (
          <Callout intent="danger" title="요청 결재 반려">
            {canResubmitRequest
              ? "결재 의견을 확인하고 결재선을 고쳐 다시 올려 주세요."
              : "작성자가 결재선을 고쳐 다시 올리면 진행됩니다."}
          </Callout>
        )}

        {(canAssign || canClose || canResubmitRequest) && (
          <div className={base.stack}>
            {canResubmitRequest && (
              <Button size="small" disabled={isResubmitting} onClick={onResubmitClick}>
                결재선 고쳐 다시 올리기
              </Button>
            )}
            {canAssign && (
              <Button variant="outline" color="secondary" size="small" disabled={isAssigning} onClick={onAssignClick}>
                {advice.owner ? "담당 변경" : "담당 배정"}
              </Button>
            )}
            {canClose && (
              <Button size="small" disabled={isClosing} onClick={onClose}>
                확인하고 종결
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
