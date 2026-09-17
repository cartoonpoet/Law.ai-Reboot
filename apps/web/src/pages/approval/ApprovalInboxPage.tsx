import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ButtonGroup, DataTable } from "@lawkit/ui";
import { useAiInsights } from "../../components/ai/useAiInsights";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { Panel } from "../../components/ui/Panel";
import { useApprovalInbox } from "./hooks/useApprovalInbox";
import { createInboxColumns, type InboxTabTypes } from "./inboxColumns";
import { toInboxRow } from "./toInboxRow";
import * as listCss from "../contract/contractList.css";
import * as css from "./approvalInbox.css";

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

// 오래 기다린(상신이 오래된) 결재가 위로 — 첫 행이 가장 급한 건.
const compareOldestFirst = (a: { submittedAt: string }, b: { submittedAt: string }) =>
  a.submittedAt.localeCompare(b.submittedAt);

/** 결재 대기함 — 내 차례·예정·처리한 결재를 계약 조회와 같은 목록으로 보여주고, 행을 누르면 문서 상세에서 처리한다. */
export const ApprovalInboxPage = () => {
  const navigate = useNavigate();
  const inbox = useApprovalInbox();
  const [tab, setTab] = useState<InboxTabTypes>("pending");
  const now = new Date();

  const items = tab === "processed" ? inbox.processed : inbox[tab].toSorted(compareOldestFirst);
  const rows = items.map((item) => toInboxRow(item, now));
  // 처리할(내 차례·예정) 결재에만 AI 브리핑 한 줄 — 열어보기 전에 우선순위를 잡게.
  const insights = useAiInsights(tab === "processed" ? [] : rows.flatMap((row) => (row.aiTarget ? [row.aiTarget] : [])));

  return (
    <div>
      <div className={css.pageHead}>
        <Eyebrow>결재</Eyebrow>
        <h1 className={css.pageTitle}>결재 대기함</h1>
      </div>

      <Panel flush>
        <div className={listCss.groupBar}>
          <ButtonGroup
            variant="segmented"
            items={TAB_ORDER.map((value) => ({ value, label: `${TAB_LABEL[value]} ${inbox[value].length}` }))}
            value={tab}
            onChange={(value) => setTab(value as InboxTabTypes)}
          />
          <div className={listCss.groupBarSpacer} />
          <span className={listCss.totalCount}>
            총 <b className={listCss.totalCountValue}>{rows.length}</b>건
          </span>
        </div>

        <div className={listCss.tableWrap}>
          <DataTable
            data={rows}
            columns={createInboxColumns(tab, insights)}
            getRowId={(row) => row.lineId}
            // 대상 문서가 삭제된 결재는 열 수 없다(href null).
            onRowClick={(row) => row.href && navigate(row.href)}
            emptyText={inbox.isLoading ? "불러오는 중…" : EMPTY_TEXT[tab]}
          />
        </div>
      </Panel>
    </div>
  );
};
