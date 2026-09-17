import { DdayBadge } from "@lawkit/ui";
import { cx } from "../../../contract/cx";
import * as base from "../../../contract/contractDetail.css";
import * as css from "../adviceDetail.css";
import { ADVICE, MOCK_TODAY, THREAD_MESSAGES } from "./adviceDetailData";

/** 요약줄 6칸 — 상태는 진행 게이지가 보여주므로 넣지 않고, 기한·대기 중인 일을 앞세운다. */
export const AdviceGlance = () => {
  const lastMessage = THREAD_MESSAGES[THREAD_MESSAGES.length - 1];
  const isWaitingRequester = lastMessage.role === "legal";

  return (
    <div className={base.glance}>
      <div className={base.gcell}>
        <div className={base.gl}>자문 분류</div>
        <div className={base.gv}>
          {ADVICE.category} <span className={css.glanceSub}>· {ADVICE.region}</span>
        </div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>요청자</div>
        <div className={base.gv}>
          {ADVICE.requesterName} <span className={css.glanceSub}>{ADVICE.requesterDept}</span>
        </div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>법무 담당</div>
        <div className={base.gv}>
          {ADVICE.ownerName} <span className={css.glanceSub}>{ADVICE.ownerTitle}</span>
        </div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>회신 기한</div>
        <div className={cx(base.gv, base.gvWarn, css.glanceValueRow)}>
          {ADVICE.dueDate}
          <DdayBadge date={ADVICE.dueDate} today={MOCK_TODAY} />
        </div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>지금 기다리는 것</div>
        <div className={base.gv}>{isWaitingRequester ? "요청자 답변" : "법무 회신"}</div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>공개 범위</div>
        <div className={base.gv}>
          {ADVICE.isSecure ? "보안" : "일반"} <span className={css.glanceSub}>열람 {ADVICE.viewerCount}명</span>
        </div>
      </div>
    </div>
  );
};
