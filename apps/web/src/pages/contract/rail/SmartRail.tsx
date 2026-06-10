import { ProgressPanel } from "./ProgressPanel";
import { AiPrecheckPanel } from "./AiPrecheckPanel";
import { RequestSummaryPanel } from "./RequestSummaryPanel";
import { ApprovalLinePanel } from "./ApprovalLinePanel";
import { darkRailVars } from "../contractTheme";
import * as css from "../contractRequest.css";

export function SmartRail() {
  // darkRailVars가 themeVars를 다크로 재바인딩 → 내부 lawkit 컴포넌트/토큰이 모두 다크로 resolve
  return (
    <div className={css.rail} style={darkRailVars as React.CSSProperties}>
      <ProgressPanel />
      <AiPrecheckPanel />
      <RequestSummaryPanel />
      <ApprovalLinePanel />
    </div>
  );
}
