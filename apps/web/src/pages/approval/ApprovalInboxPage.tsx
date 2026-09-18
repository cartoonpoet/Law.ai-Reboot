import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  ButtonGroup,
  HStack,
  Pagination,
  PaginationCount,
  StatCell,
  StatGrid,
  VStack,
  Widget,
} from "@lawkit/ui";
import { getAiTargetKey, useAiInsights } from "../../components/ai/useAiInsights";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { useApprovalInbox } from "./hooks/useApprovalInbox";
import { useInboxDecide } from "./hooks/useInboxDecide";
import { InboxCard } from "./InboxCard";
import { InboxRejectModal } from "./InboxRejectModal";
import { toInboxRow, type InboxRow } from "./toInboxRow";
import * as css from "./approvalInbox.css";

type InboxTabTypes = "pending" | "upcoming" | "processed";

const TAB_LABEL: Record<InboxTabTypes, string> = {
  pending: "내 차례",
  upcoming: "예정",
  processed: "처리한 결재",
};

const TAB_ORDER: InboxTabTypes[] = ["pending", "upcoming", "processed"];

const EMPTY_TEXT: Record<InboxTabTypes, string> = {
  pending: "지금 처리할 결재가 없습니다.",
  upcoming: "내 차례를 기다리는 결재가 없습니다.",
  processed: "최근 30일 동안 처리한 결재가 없습니다.",
};

// 한 화면에 카드가 너무 많이 쌓이지 않게 끊어 보여준다.
const PAGE_SIZE = 8;

// 오래 기다린(상신이 오래된) 결재가 위로 — 첫 카드가 가장 급한 건.
const compareOldestFirst = (a: { submittedAt: string }, b: { submittedAt: string }) =>
  a.submittedAt.localeCompare(b.submittedAt);

/**
 * 결재 대기함 — 급한 결재부터 카드로 쌓고, 문서를 열지 않아도 그 자리에서 승인·반려한다.
 * 여러 건을 골라 한꺼번에 승인할 수 있고, 목록은 페이지로 끊어 보여준다.
 */
export const ApprovalInboxPage = () => {
  const navigate = useNavigate();
  const inbox = useApprovalInbox();
  const { decide, isDeciding, approveMany, isApprovingMany } = useInboxDecide();
  const [tab, setTab] = useState<InboxTabTypes>("pending");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectTarget, setRejectTarget] = useState<InboxRow | null>(null);
  const now = new Date();

  const items = tab === "processed" ? inbox.processed : inbox[tab].toSorted(compareOldestFirst);
  const rows = items.map((item) => toInboxRow(item, now));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // 목록이 줄어 현재 페이지가 비면 마지막 페이지를 보여준다(effect 없이 렌더 중 보정).
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const isProcessedTab = tab === "processed";
  const isBusy = isDeciding || isApprovingMany;

  // 처리할(내 차례·예정) 결재에만 AI 브리핑 한 줄 — 열어보기 전에 우선순위를 잡게. 보이는 페이지만 조회한다.
  const insights = useAiInsights(
    isProcessedTab ? [] : pageRows.flatMap((row) => (row.aiTarget ? [row.aiTarget] : [])),
  );

  // 승인·반려는 "내 차례" 목록에서만 — 예정·처리한 결재는 고를 수 없다.
  const selectableIds = tab === "pending" ? pageRows.map((row) => row.lineId) : [];
  const selectedOnPage = selectedIds.filter((id) => selectableIds.includes(id));

  const changeTab = (next: InboxTabTypes) => {
    setTab(next);
    setPage(1);
    setSelectedIds([]);
  };

  const changePage = (next: number) => {
    setPage(next);
    setSelectedIds([]);
  };

  const handleToggle = (lineId: string, isChecked: boolean) =>
    setSelectedIds((prev) => (isChecked ? [...prev, lineId] : prev.filter((id) => id !== lineId)));

  const handleApproveSelected = () => {
    approveMany(selectedOnPage);
    setSelectedIds([]);
  };

  const handleReject = (comment: string) => {
    if (!rejectTarget) return;
    decide({ lineId: rejectTarget.lineId, decision: "reject", comment });
    setRejectTarget(null);
  };

  return (
    <VStack gap="x4">
      <VStack gap="x1">
        <Eyebrow>결재</Eyebrow>
        <h1 className={css.pageTitle}>결재 대기함</h1>
      </VStack>

      <Widget title="내 결재">
        <StatGrid>
          <StatCell label="내 차례" value={inbox.pending.length} valueColor="primary" active />
          <StatCell
            label="3일 넘게 대기"
            value={inbox.pending.filter((item) => toInboxRow(item, now).waitingDays >= 3).length}
            valueColor="danger"
          />
          <StatCell label="내 차례 예정" value={inbox.upcoming.length} valueColor="heading" />
          <StatCell label="최근 30일 처리" value={inbox.processed.length} valueColor="heading" />
        </StatGrid>
      </Widget>

      <HStack gap="x3" justify="between" align="center">
        <ButtonGroup
          variant="segmented"
          value={tab}
          onChange={(value) => changeTab(value as InboxTabTypes)}
          items={TAB_ORDER.map((value) => ({ value, label: `${TAB_LABEL[value]} ${inbox[value].length}` }))}
        />
        {!isProcessedTab && (
          <Button size="small" disabled={selectedOnPage.length === 0 || isBusy} onClick={handleApproveSelected}>
            선택한 {selectedOnPage.length}건 승인
          </Button>
        )}
      </HStack>

      {pageRows.length === 0 ? (
        <p className={css.empty}>{inbox.isLoading ? "불러오는 중…" : EMPTY_TEXT[tab]}</p>
      ) : (
        <VStack gap="x3">
          {pageRows.map((row) => (
            <InboxCard
              key={row.lineId}
              row={row}
              insight={row.aiTarget ? (insights[getAiTargetKey(row.aiTarget)] ?? null) : null}
              isSelected={selectedIds.includes(row.lineId)}
              canDecide={tab === "pending"}
              isBusy={isBusy}
              onToggle={(isChecked) => handleToggle(row.lineId, isChecked)}
              onOpen={() => row.href && navigate(row.href)}
              onApprove={() => decide({ lineId: row.lineId, decision: "approve" })}
              onReject={() => setRejectTarget(row)}
            />
          ))}
        </VStack>
      )}

      {rows.length > 0 && (
        <div className={css.pager}>
          <PaginationCount totalCount={rows.length} />
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={changePage} />
        </div>
      )}

      {rejectTarget && (
        <InboxRejectModal
          title={rejectTarget.title}
          isRejecting={isDeciding}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}
    </VStack>
  );
};
