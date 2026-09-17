import { useState } from "react";
import { Button, ButtonGroup, Checkbox } from "@lawkit/ui";
import { Tag } from "../../../components/ui/Tag";
import { AiLine } from "./AiLine";
import { MockPageHead } from "./MockPageHead";
import { WaitingLabel } from "./WaitingLabel";
import {
  KIND_LABEL,
  PENDING_ITEMS,
  PROCESSED_COUNT,
  ROLE_LABEL,
  UPCOMING_COUNT,
  type MockInboxItem,
} from "./approvalInboxMockData";
import * as css from "./approvalInboxMock.css";

// 오래 기다린 것부터 — 첫 카드가 가장 급한 결재.
const SORTED_ITEMS = PENDING_ITEMS.toSorted((a, b) => b.waitingDays - a.waitingDays);

interface QueueCardProps {
  item: MockInboxItem;
  isSelected: boolean;
  onToggle: (isChecked: boolean) => void;
}

const QueueCard = ({ item, isSelected, onToggle }: QueueCardProps) => (
  <article className={isSelected ? `${css.queueCard} ${css.queueCardSelected}` : css.queueCard}>
    <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label={`${item.title} 선택`} />
    <div className={css.queueMain}>
      <div className={css.queueTitleRow}>
        <Tag>{KIND_LABEL[item.kind]}</Tag>
        <span className={css.queueTitle}>{item.title}</span>
      </div>
      <div className={css.queueMeta}>
        <span className={css.mono}>{item.code}</span>
        <span>·</span>
        <span>
          {item.submitterName} {item.submitterDept}
        </span>
        <span>·</span>
        <span>
          {ROLE_LABEL[item.myRole]} {item.myStep}/{item.totalSteps}
        </span>
      </div>
      <div className={css.factRow}>
        {item.facts.map((fact) => (
          <div key={fact.label} className={css.fact}>
            <span className={css.factLabel}>{fact.label}</span>
            <span className={css.factValue}>{fact.value}</span>
          </div>
        ))}
      </div>
      <AiLine item={item} />
    </div>
    <div className={css.queueSide}>
      <WaitingLabel days={item.waitingDays} />
      <div className={css.buttonRow}>
        <Button size="small" variant="outline" color="secondary">
          자세히
        </Button>
        <Button size="small" variant="outline" color="danger">
          반려
        </Button>
        <Button size="small">{item.myRole === "agree" ? "합의" : "승인"}</Button>
      </div>
    </div>
  </article>
);

/** 시안 A — 처리 큐형: 급한 결재부터 카드로 쌓고, 핵심 정보·AI 한 줄을 보고 그 자리에서 승인·반려. */
export const ApprovalQueueMock = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tab, setTab] = useState("pending");

  const handleToggle = (id: string, isChecked: boolean) =>
    setSelectedIds((prev) => (isChecked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)));

  return (
    <div className={css.page}>
      <MockPageHead
        variant="A. 처리 큐형"
        description="급한 결재부터 카드로 보여주고, 금액·기간 같은 핵심 정보와 AI 한 줄을 보고 목록에서 바로 승인·반려합니다. 여러 건을 골라 한꺼번에 승인할 수 있어요."
      >
        <p className={css.headSummary}>
          처리할 결재 <span className={css.headStrong}>{PENDING_ITEMS.length}건</span> · 3일 넘게 기다린 결재{" "}
          <span className={css.headStrong}>{PENDING_ITEMS.filter((item) => item.waitingDays >= 3).length}건</span>
        </p>
      </MockPageHead>

      <div className={css.queueToolbar}>
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
      </div>

      <div className={css.queueList}>
        {SORTED_ITEMS.map((item) => (
          <QueueCard
            key={item.id}
            item={item}
            isSelected={selectedIds.includes(item.id)}
            onToggle={(isChecked) => handleToggle(item.id, isChecked)}
          />
        ))}
      </div>
    </div>
  );
};
