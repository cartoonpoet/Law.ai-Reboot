import { useState } from "react";
import { Badge, ButtonGroup, Card, DataTable, VStack } from "@lawkit/ui";
import { MockPageHead } from "./MockPageHead";
import { createGroupedColumns } from "./approvalGroupedColumns";
import { KIND_LABEL, KIND_ORDER, PENDING_ITEMS, PROCESSED_COUNT, UPCOMING_COUNT } from "./approvalInboxMockData";

/** 시안 C — 유형별 묶음형: 체결 품의·자문 요청·자문 회신을 따로 묶어 유형마다 필요한 칸을 보여준다. */
export const ApprovalGroupedMock = () => {
  const [tab, setTab] = useState("pending");
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    items: PENDING_ITEMS.filter((item) => item.kind === kind).toSorted((a, b) => b.waitingDays - a.waitingDays),
  })).filter((group) => group.items.length > 0);

  return (
    <VStack gap="x4">
      <MockPageHead
        variant="C. 유형별 묶음형"
        description="체결 품의·자문 요청·자문 회신을 따로 묶어, 유형마다 결재자가 먼저 봐야 할 칸(금액·질의 요지·회신 요지)을 보여줍니다. 처리는 문서 상세에서 해요."
      >
        <ButtonGroup
          variant="segmented"
          value={tab}
          onChange={(value) => setTab(String(value))}
          items={[
            { value: "pending", label: `내 차례 ${PENDING_ITEMS.length}` },
            { value: "upcoming", label: `예정 ${UPCOMING_COUNT}` },
            { value: "processed", label: `처리한 결재 ${PROCESSED_COUNT}` },
          ]}
        />
      </MockPageHead>

      {groups.map((group) => (
        <Card
          key={group.kind}
          bordered
          header={KIND_LABEL[group.kind]}
          headerActions={<Badge variant="muted" tone="neutral">{group.items.length}건</Badge>}
        >
          <DataTable
            data={group.items}
            columns={createGroupedColumns(group.kind)}
            getRowId={(item) => item.id}
            emptyText="처리할 결재가 없습니다."
          />
        </Card>
      ))}
    </VStack>
  );
};
