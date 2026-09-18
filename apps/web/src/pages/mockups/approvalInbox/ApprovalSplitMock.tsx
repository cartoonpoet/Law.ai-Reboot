import { useState } from "react";
import {
  ApprovalLine,
  Button,
  ButtonGroup,
  Card,
  Grid,
  HStack,
  Icon,
  ListGroup,
  ListGroupItem,
  Textarea,
  VStack,
} from "@lawkit/ui";
import { AiLine } from "./AiLine";
import { KindBadge } from "./KindBadge";
import { MockPageHead } from "./MockPageHead";
import { WaitingLabel } from "./WaitingLabel";
import { toApprovalLineItems } from "./toApprovalLineItems";
import { KIND_LABEL, PENDING_ITEMS, PROCESSED_COUNT, ROLE_LABEL, UPCOMING_COUNT } from "./approvalInboxMockData";
import * as css from "./approvalInboxMock.css";

const SORTED_ITEMS = PENDING_ITEMS.toSorted((a, b) => b.waitingDays - a.waitingDays);

/** 시안 B — 목록 + 미리보기형: 왼쪽에서 고르면 오른쪽에서 내용·결재선을 보고 의견을 적어 바로 처리. */
export const ApprovalSplitMock = () => {
  const [selectedId, setSelectedId] = useState(SORTED_ITEMS[0].id);
  const [tab, setTab] = useState("pending");
  const selected = SORTED_ITEMS.find((item) => item.id === selectedId) ?? SORTED_ITEMS[0];

  const decideFooter = (
    <VStack gap="x3">
      <Textarea key={selected.id} textareaSize="small" rows={2} resize="none" placeholder="결재 의견 (선택)" />
      <HStack gap="x2" justify="end">
        <Button variant="outline" color="danger">
          반려
        </Button>
        <Button>{selected.myRole === "agree" ? "합의" : "승인"}</Button>
      </HStack>
    </VStack>
  );

  return (
    <VStack gap="x4">
      <MockPageHead
        variant="B. 목록 + 미리보기형"
        description="왼쪽 목록에서 결재를 고르면 오른쪽에 핵심 내용·AI 브리핑·결재선이 열립니다. 상세 화면으로 옮겨 다니지 않고 의견을 적어 바로 승인·반려해요."
      />

      <div className={css.split}>
        <Card bordered>
          <VStack gap="x3">
            <ButtonGroup
              variant="segmented"
              value={tab}
              onChange={(value) => setTab(String(value))}
              items={[
                { value: "pending", label: `내 차례 ${PENDING_ITEMS.length}` },
                { value: "upcoming", label: `예정 ${UPCOMING_COUNT}` },
                { value: "processed", label: `처리 ${PROCESSED_COUNT}` },
              ]}
            />
            <ListGroup variant="flush">
              {SORTED_ITEMS.map((item) => (
                <ListGroupItem
                  key={item.id}
                  active={item.id === selected.id}
                  onClick={() => setSelectedId(item.id)}
                  trailing={<WaitingLabel days={item.waitingDays} />}
                >
                  <span className={css.listTitle}>{item.title}</span>
                  <span className={css.listMeta}>
                    {KIND_LABEL[item.kind]} · {item.submitterName} {item.submitterDept} · {ROLE_LABEL[item.myRole]}{" "}
                    {item.myStep}/{item.totalSteps}
                  </span>
                </ListGroupItem>
              ))}
            </ListGroup>
          </VStack>
        </Card>

        <Card
          bordered
          header={<KindBadge kind={selected.kind} />}
          title={selected.title}
          headerActions={
            <Button size="small" variant="outline" color="secondary" iconLeft={<Icon name="externalLink" size="sm" />}>
              문서 열기
            </Button>
          }
          footer={decideFooter}
        >
          <VStack gap="x5">
            <HStack gap="x2" align="center">
              <span className={css.metaCode}>{selected.code}</span>
              <span className={css.meta}>
                {selected.submitterName} {selected.submitterDept} 상신 {selected.submittedAt}
              </span>
            </HStack>

            <VStack gap="x2">
              <span className={css.sectionLabel}>핵심 내용</span>
              <Grid columns={3} gap="x4">
                {selected.facts.map((fact) => (
                  <VStack key={fact.label} gap="x1">
                    <span className={css.factLabel}>{fact.label}</span>
                    <span className={css.factValue}>{fact.value}</span>
                  </VStack>
                ))}
              </Grid>
            </VStack>

            {selected.aiSummary && (
              <VStack gap="x2">
                <span className={css.sectionLabel}>AI 브리핑</span>
                <AiLine item={selected} />
              </VStack>
            )}

            <VStack gap="x2">
              <span className={css.sectionLabel}>
                결재선 · {ROLE_LABEL[selected.myRole]} {selected.myStep}/{selected.totalSteps}
              </span>
              <ApprovalLine items={toApprovalLineItems(selected)} />
            </VStack>
          </VStack>
        </Card>
      </div>
    </VStack>
  );
};
