import { useState } from "react";
import { Button, ButtonGroup, Card, Checkbox, HStack, StatCell, StatGrid, VStack, Widget } from "@lawkit/ui";
import { AiLine } from "./AiLine";
import { KindBadge } from "./KindBadge";
import { MockPageHead } from "./MockPageHead";
import { WaitingLabel } from "./WaitingLabel";
import {
  PENDING_ITEMS,
  PROCESSED_COUNT,
  ROLE_LABEL,
  UPCOMING_COUNT,
  type MockInboxItem,
} from "./approvalInboxMockData";
import * as css from "./approvalInboxMock.css";

// 오래 기다린 것부터 — 첫 카드가 가장 급한 결재.
const SORTED_ITEMS = PENDING_ITEMS.toSorted((a, b) => b.waitingDays - a.waitingDays);
const LATE_COUNT = PENDING_ITEMS.filter((item) => item.waitingDays >= 3).length;

interface QueueCardProps {
  item: MockInboxItem;
  isSelected: boolean;
  onToggle: (isChecked: boolean) => void;
}

const QueueCard = ({ item, isSelected, onToggle }: QueueCardProps) => (
  <Card bordered>
    <HStack gap="x4" align="start">
      <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label={`${item.title} 선택`} />

      <VStack gap="x2" className={css.grow}>
        <HStack gap="x2" align="center">
          <KindBadge kind={item.kind} />
          <span className={css.cardTitle}>{item.title}</span>
        </HStack>
        <HStack gap="x2" align="center">
          <span className={css.metaCode}>{item.code}</span>
          <span className={css.meta}>
            {item.submitterName} {item.submitterDept}
          </span>
          <span className={css.meta}>
            {ROLE_LABEL[item.myRole]} {item.myStep}/{item.totalSteps}
          </span>
        </HStack>
        <HStack gap="x6" align="start">
          {item.facts.map((fact) => (
            <VStack key={fact.label} gap="x1">
              <span className={css.factLabel}>{fact.label}</span>
              <span className={css.factValue}>{fact.value}</span>
            </VStack>
          ))}
        </HStack>
        <AiLine item={item} />
      </VStack>

      <VStack gap="x3" align="end">
        <WaitingLabel days={item.waitingDays} />
        <HStack gap="x1">
          <Button size="small" variant="outline" color="secondary">
            자세히
          </Button>
          <Button size="small" variant="outline" color="danger">
            반려
          </Button>
          <Button size="small">{item.myRole === "agree" ? "합의" : "승인"}</Button>
        </HStack>
      </VStack>
    </HStack>
  </Card>
);

/** 시안 A — 처리 큐형: 급한 결재부터 카드로 쌓고, 핵심 정보·AI 한 줄을 보고 그 자리에서 승인·반려. */
export const ApprovalQueueMock = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tab, setTab] = useState("pending");

  const handleToggle = (id: string, isChecked: boolean) =>
    setSelectedIds((prev) => (isChecked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)));

  return (
    <VStack gap="x4">
      <MockPageHead
        variant="A. 처리 큐형"
        description="급한 결재부터 카드로 보여주고, 금액·기간 같은 핵심 정보와 AI 한 줄을 보고 목록에서 바로 승인·반려합니다. 여러 건을 골라 한꺼번에 승인할 수 있어요."
      />

      <Widget title="내 결재">
        <StatGrid>
          <StatCell label="내 차례" value={PENDING_ITEMS.length} valueColor="primary" active />
          <StatCell label="3일 넘게 대기" value={LATE_COUNT} valueColor="danger" />
          <StatCell label="내 차례 예정" value={UPCOMING_COUNT} valueColor="heading" />
          <StatCell label="최근 30일 처리" value={PROCESSED_COUNT} valueColor="heading" />
        </StatGrid>
      </Widget>

      <HStack gap="x3" justify="between" align="center">
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
        <Button size="small" disabled={selectedIds.length === 0}>
          선택한 {selectedIds.length}건 승인
        </Button>
      </HStack>

      <VStack gap="x3">
        {SORTED_ITEMS.map((item) => (
          <QueueCard
            key={item.id}
            item={item}
            isSelected={selectedIds.includes(item.id)}
            onToggle={(isChecked) => handleToggle(item.id, isChecked)}
          />
        ))}
      </VStack>
    </VStack>
  );
};
