import { DdayBadge } from "@lawkit/ui";
import type { AdviceResponse } from "@lawai/contracts";
import { cx } from "../../contract/cx";
import { REGION_LABEL, SECURITY_LEVEL_LABEL } from "../adviceMeta";
import * as base from "../../contract/contractDetail.css";
import * as css from "./adviceDetail.css";

interface AdviceGlanceProps {
  advice: AdviceResponse;
}

// 지금 누구 차례인지 — 상태는 진행 게이지가 보여주므로 여기서는 기다리는 쪽만 말한다.
const getWaitingLabel = (advice: AdviceResponse): string => {
  switch (advice.status) {
    case "received":
      return "담당 배정";
    case "reviewing":
      return "법무 회신";
    case "waitingRequester":
      return "요청자 답변";
    case "answered":
      return "요청자 확인·종결";
    case "closed":
      return "없음";
  }
};

/** 요약줄 6칸 — 분류 · 요청자 · 법무 담당 · 회신 기한 · 지금 기다리는 것 · 공개 범위. */
export const AdviceGlance = ({ advice }: AdviceGlanceProps) => {
  const isOpen = advice.status !== "answered" && advice.status !== "closed";
  const [firstCategory, ...restCategories] = advice.categories;

  return (
    <div className={base.glance}>
      <div className={base.gcell}>
        <div className={base.gl}>자문 분류</div>
        <div className={base.gv}>
          {firstCategory}
          {restCategories.length > 0 && ` 외 ${restCategories.length}`}
          <span className={css.glanceSub}> · {REGION_LABEL[advice.region]}</span>
        </div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>요청자</div>
        <div className={base.gv}>
          {advice.requester.name ?? "-"} <span className={css.glanceSub}>{advice.requester.dept ?? ""}</span>
        </div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>법무 담당</div>
        <div className={cx(base.gv, !advice.owner && base.gvWarn)}>
          {advice.owner ? advice.owner.name ?? "-" : "미배정"}
        </div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>회신 기한</div>
        <div className={cx(base.gv, css.glanceValueRow)}>
          {advice.dueDate ? advice.dueDate.slice(0, 10) : "-"}
          {advice.dueDate && isOpen && <DdayBadge date={advice.dueDate.slice(0, 10)} />}
        </div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>지금 기다리는 것</div>
        <div className={base.gv}>{getWaitingLabel(advice)}</div>
      </div>
      <div className={base.gcell}>
        <div className={base.gl}>공개 범위</div>
        <div className={base.gv}>
          {SECURITY_LEVEL_LABEL[advice.securityLevel]}
          {advice.details.ccUsers.length > 0 && <span className={css.glanceSub}> · 참조 {advice.details.ccUsers.length}명</span>}
        </div>
      </div>
    </div>
  );
};
