import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button } from "@lawkit/ui";
import { AiInsightNote } from "../../components/ai/AiInsightNote";
import {
  getAiTargetKey,
  useAiInsights,
} from "../../components/ai/useAiInsights";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { cx } from "../contract/cx";
import { useApprovalInbox } from "./hooks/useApprovalInbox";
import { toInboxRow } from "./toInboxRow";
import type { InboxRow } from "./toInboxRow";
import * as css from "./approvalInbox.css";

type TabTypes = "pending" | "upcoming" | "processed";

const TABS: { value: TabTypes; label: string }[] = [
  { value: "pending", label: "내 차례" },
  { value: "upcoming", label: "예정" },
  { value: "processed", label: "처리한 결재" },
];

const EMPTY_TEXT: Record<TabTypes, string> = {
  pending: "처리할 결재가 없습니다",
  upcoming: "내 차례를 기다리는 결재가 없습니다",
  processed: "최근 30일 동안 처리한 결재가 없습니다",
};

// 오래 기다린(상신이 오래된) 결재가 위로 — 첫 행이 가장 급한 건.
const compareOldestFirst = (
  a: { submittedAt: string },
  b: { submittedAt: string },
) => a.submittedAt.localeCompare(b.submittedAt);

const ResultBadge = ({ row }: { row: InboxRow }) => {
  const variant =
    row.myStatus === "approved"
      ? css.badge.approved
      : row.myStatus === "rejected"
        ? css.badge.rejected
        : css.badge.neutral;
  return <span className={variant}>{row.myStatusLabel}</span>;
};

/**
 * 결재 대기함 — 내 차례가 된 결재를 처리만 하는 목록(시안 approval-process-mockup ①).
 * 통계(내 차례·예정·최근 30일 처리) → 탭(내 차례·예정·처리한 결재) → 표. 처리할 결재엔 AI 브리핑 한 줄. 참조 받은 문서 탭은 후속.
 */
export const ApprovalInboxPage = () => {
  const navigate = useNavigate();
  const { pending, upcoming, processed, isLoading } = useApprovalInbox();
  const [tab, setTab] = useState<TabTypes>("pending");
  const now = new Date();

  const itemsByTab = { pending, upcoming, processed };
  const items =
    tab === "processed"
      ? processed
      : itemsByTab[tab].toSorted(compareOldestFirst);
  const rows = items.map((item) => toInboxRow(item, now));
  const isProcessedTab = tab === "processed";
  // 처리할(내 차례·예정) 결재에만 AI 브리핑 한 줄 — 결재자가 열어보기 전에 우선순위를 잡게
  const insights = useAiInsights(
    isProcessedTab
      ? []
      : rows.flatMap((row) => (row.aiTarget ? [row.aiTarget] : [])),
  );

  return (
    <div>
      <div className={css.phead}>
        <div>
          <Eyebrow>결재</Eyebrow>
          <h1 className={css.title}>결재 대기함</h1>
          <p className={css.pdesc}>
            내 차례가 된 결재 건을 <b>처리만</b> 하는 목록입니다(여기서 결재를
            새로 만들 수 없음). [처리]는 해당 문서 상세로 이동합니다. 상신은
            항상 대상 문서 화면에서 합니다.
          </p>
        </div>
      </div>

      <div className={css.stats}>
        <div className={cx(css.stat, css.statHot)}>
          <div className={css.statLabel}>내 차례</div>
          <div className={cx(css.statValue, css.statValueHot)}>
            {pending.length}
            <span className={css.statUnit}>건</span>
          </div>
        </div>
        <div className={css.stat}>
          <div className={css.statLabel}>내 차례 예정</div>
          <div className={css.statValue}>
            {upcoming.length}
            <span className={css.statUnit}>건</span>
          </div>
        </div>
        <div className={css.stat}>
          <div className={css.statLabel}>최근 30일 처리</div>
          <div className={css.statValue}>
            {processed.length}
            <span className={css.statUnit}>건</span>
          </div>
        </div>
      </div>

      <div className={css.card}>
        <div className={css.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className={cx(css.tab, tab === t.value && css.tabOn)}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              {t.value === "pending" && (
                <span className={css.tabCount}>{pending.length}</span>
              )}
            </button>
          ))}
        </div>

        {!isLoading && rows.length === 0 && (
          <div className={css.empty}>{EMPTY_TEXT[tab]}</div>
        )}

        {rows.length > 0 && (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th className={css.th}>문서</th>
                  <th className={css.th}>결재 유형</th>
                  <th className={css.th}>상신자</th>
                  <th className={css.th}>
                    {isProcessedTab ? "처리 결과" : "내 단계"}
                  </th>
                  <th className={css.th}>상신일</th>
                  <th className={css.th}>
                    {isProcessedTab ? "처리일" : "경과"}
                  </th>
                  <th className={css.th} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  // 대상 계약이 삭제된 결재는 열 수 없다(href null) — 제목 링크·처리/보기 버튼을 뺀다.
                  const href = row.href;
                  const insight = row.aiTarget
                    ? insights[getAiTargetKey(row.aiTarget)]
                    : null;
                  return (
                    <tr
                      key={row.lineId}
                      className={
                        tab === "pending" && i === 0 ? css.rowHot : undefined
                      }
                    >
                      <td className={css.td}>
                        <div className={css.doc}>
                          <span
                            className={href ? css.docTitle : css.docTitleDeleted}
                            onClick={href ? () => navigate(href) : undefined}
                          >
                            {tab === "pending" && (
                              <span className={css.liveDot} />
                            )}
                            {row.title}
                          </span>
                          <span className={css.docMeta}>{row.docMeta}</span>
                          {insight && <AiInsightNote insight={insight} />}
                        </div>
                      </td>
                      <td className={css.td}>
                        <span className={css.badge.kind}>{row.kindLabel}</span>
                      </td>
                      <td className={css.td}>
                        <div className={css.person}>
                          <Avatar
                            size="sm"
                            color="primary"
                            initials={row.submittedByName[0]}
                          />
                          <div>
                            <div className={css.personName}>
                              {row.submittedByName}
                            </div>
                            <div className={css.personDept}>
                              {row.submittedByDept}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={css.td}>
                        {isProcessedTab ? (
                          <ResultBadge row={row} />
                        ) : (
                          <span className={css.stepCell}>
                            <span className={css.stepPos}>
                              {row.stepNumber}
                              <small className={css.stepTotal}>
                                /{row.totalSteps}
                              </small>
                            </span>
                            <span
                              className={
                                row.isAgree ? css.badge.agree : css.badge.kind
                              }
                            >
                              {row.roleLabel}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className={css.td}>{row.submittedAtLabel}</td>
                      <td className={css.td}>
                        {isProcessedTab ? (
                          (row.myDecidedAtLabel ?? "-")
                        ) : (
                          <span className={css.elapsed[row.elapsedTone]}>
                            {row.elapsedLabel}
                          </span>
                        )}
                      </td>
                      <td className={css.td}>
                        {tab === "pending" && href && (
                          <Button
                            size="small"
                            onClick={() => navigate(href)}
                          >
                            처리
                          </Button>
                        )}
                        {tab === "upcoming" && href && (
                          <Button
                            size="small"
                            variant="outline"
                            color="secondary"
                            onClick={() => navigate(href)}
                          >
                            보기
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
