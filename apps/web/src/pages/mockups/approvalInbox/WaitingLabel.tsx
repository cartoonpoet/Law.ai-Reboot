import * as css from "./approvalInboxMock.css";

// 상신 후 지난 날 — 오늘은 흐리게, 1~2일은 주황, 3일 이상은 빨강.
export const WaitingLabel = ({ days }: { days: number }) => {
  if (days <= 0) return <span className={css.wait.today}>오늘 상신</span>;
  return <span className={days >= 3 ? css.wait.overdue : css.wait.late}>{days}일째 대기</span>;
};
