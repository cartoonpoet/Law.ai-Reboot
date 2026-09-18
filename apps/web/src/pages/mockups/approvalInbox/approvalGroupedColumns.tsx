import type { ColumnDef } from "@lawkit/ui";
import { Avatar, Badge, Button, HStack, VStack } from "@lawkit/ui";
import { AiLine } from "./AiLine";
import { WaitingLabel } from "./WaitingLabel";
import { ROLE_LABEL, type MockInboxItem, type MockKindTypes } from "./approvalInboxMockData";
import * as css from "./approvalInboxMock.css";

// 유형마다 결재자가 먼저 봐야 할 칸이 다르다.
export const KEY_FACT_LABEL: Record<MockKindTypes, string> = {
  contractSign: "금액",
  adviceRequest: "질의 요지",
  adviceAnswer: "회신 요지",
};

const getKeyFact = (item: MockInboxItem): string =>
  item.facts.find((fact) => fact.label === KEY_FACT_LABEL[item.kind])?.value ?? "-";

/** 유형별 묶음 표 컬럼 — 문서·핵심 칸·상신자·내 단계·대기·처리. */
export const createGroupedColumns = (kind: MockKindTypes): ColumnDef<MockInboxItem>[] => [
  {
    id: "doc",
    header: "문서",
    size: 360,
    cell: (info) => (
      <VStack gap="x1">
        <span className={css.rowTitle}>{info.row.original.title}</span>
        <span className={css.metaCode}>{info.row.original.code}</span>
        <AiLine item={info.row.original} />
      </VStack>
    ),
  },
  {
    id: "keyFact",
    header: KEY_FACT_LABEL[kind],
    size: 260,
    cell: (info) => <span className={css.factValue}>{getKeyFact(info.row.original)}</span>,
  },
  {
    id: "submitter",
    header: "상신자",
    size: 150,
    cell: (info) => (
      <HStack gap="x2" align="center">
        <Avatar size="sm" color="primary" initials={info.row.original.submitterName[0]} />
        <VStack gap="x1">
          <span className={css.factValue}>{info.row.original.submitterName}</span>
          <span className={css.meta}>{info.row.original.submitterDept}</span>
        </VStack>
      </HStack>
    ),
  },
  {
    id: "step",
    header: "내 단계",
    size: 110,
    cell: (info) => (
      <Badge variant="muted" tone="neutral">
        {ROLE_LABEL[info.row.original.myRole]} {info.row.original.myStep}/{info.row.original.totalSteps}
      </Badge>
    ),
  },
  {
    id: "wait",
    header: "대기",
    size: 110,
    cell: (info) => <WaitingLabel days={info.row.original.waitingDays} />,
  },
  {
    id: "action",
    header: "",
    size: 80,
    cell: () => <Button size="small">처리</Button>,
  },
];
