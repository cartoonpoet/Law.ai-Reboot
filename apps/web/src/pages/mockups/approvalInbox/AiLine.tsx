import { Icon } from "@lawkit/ui";
import type { MockInboxItem } from "./approvalInboxMockData";
import * as css from "./approvalInboxMock.css";

/** AI 한 줄 — 결재 전에 볼 점. 분석이 없으면 아무것도 그리지 않는다. */
export const AiLine = ({ item }: { item: MockInboxItem }) =>
  item.aiSummary ? (
    <p className={`${css.aiLine} ${css.aiTone[item.aiTone]}`}>
      <Icon name="autoAwesome" size="sm" className={css.aiIcon} />
      {item.aiSummary}
    </p>
  ) : null;
