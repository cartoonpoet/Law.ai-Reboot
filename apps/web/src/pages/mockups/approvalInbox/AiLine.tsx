import { HStack, Icon } from "@lawkit/ui";
import type { MockInboxItem } from "./approvalInboxMockData";
import * as css from "./approvalInboxMock.css";

/** AI 한 줄 — 결재 전에 볼 점. 분석이 없으면 아무것도 그리지 않는다. */
export const AiLine = ({ item }: { item: MockInboxItem }) =>
  item.aiSummary ? (
    <HStack gap="x1" align="start">
      <Icon name="autoAwesome" size="sm" className={`${css.aiIcon} ${css.aiTone[item.aiTone]}`} />
      <span className={`${css.aiText} ${css.aiTone[item.aiTone]}`}>{item.aiSummary}</span>
    </HStack>
  ) : null;
