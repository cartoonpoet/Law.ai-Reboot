import { Badge } from "../../../components/ui/Badge";

/**
 * 상신 후 지난 날 — 오늘은 흐리게, 1~2일은 주황, 3일 이상은 빨강.
 * lawkit Badge 는 primary·neutral 두 색뿐이라 급한 정도를 색으로 구분하려고 앱 배지를 쓴다.
 */
export const WaitingLabel = ({ days }: { days: number }) => {
  if (days <= 0) return <Badge color="secondary" size="sm">오늘 상신</Badge>;
  return (
    <Badge color={days >= 3 ? "danger" : "warning"} size="sm">
      {days}일째 대기
    </Badge>
  );
};
