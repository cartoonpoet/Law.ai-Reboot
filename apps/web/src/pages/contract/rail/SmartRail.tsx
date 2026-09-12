import { Card, Icon } from "@lawkit/ui";
import { ProgressPanel } from "./ProgressPanel";
import { ApprovalLinePanel } from "./ApprovalLinePanel";
import * as css from "../contractRequest.css";

// AI 사전 점검 안내 — 실 분석은 저장(등록) 후 트리거되므로, 폼 단계에서는
// 동기 mock 분석 대신 안내 문구만 보여준다(상세 페이지 AiRiskCard 가 실동작 담당).
const aiNoticeHeader = (
  <span className={css.railHead}>
    <Icon name="autoAwesome" size="sm" className={css.railHeadIcon} />
    AI 사전 점검
  </span>
);

export function SmartRail() {
  return (
    <div className={css.rail}>
      <ProgressPanel />
      <Card bordered header={aiNoticeHeader}>
        <p className={css.aiNotice}>저장 후 AI가 자동으로 사전 점검합니다.</p>
      </Card>
      <ApprovalLinePanel />
    </div>
  );
}
