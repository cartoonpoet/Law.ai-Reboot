import { Badge } from "@lawkit/ui";
import { KIND_LABEL, type MockKindTypes } from "./approvalInboxMockData";

/** 결재 유형(체결 품의·자문 요청·자문 회신) 표시. */
export const KindBadge = ({ kind }: { kind: MockKindTypes }) => (
  <Badge variant="outline" tone="neutral">
    {KIND_LABEL[kind]}
  </Badge>
);
