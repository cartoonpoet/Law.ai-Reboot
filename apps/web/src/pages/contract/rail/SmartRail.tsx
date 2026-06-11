import { ProgressPanel } from "./ProgressPanel";
import { AiPrecheckPanel } from "./AiPrecheckPanel";
import { ApprovalLinePanel } from "./ApprovalLinePanel";
import * as css from "../contractRequest.css";

export function SmartRail() {
  return (
    <div className={css.rail}>
      <ProgressPanel />
      <AiPrecheckPanel />
      <ApprovalLinePanel />
    </div>
  );
}
