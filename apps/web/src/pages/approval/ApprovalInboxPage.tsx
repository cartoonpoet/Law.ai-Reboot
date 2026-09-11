import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Avatar } from "@lawkit/ui";
import type { ApprovalInboxItem } from "@lawai/contracts";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { cx } from "../contract/cx";
import { useApprovalInbox } from "./hooks/useApprovalInbox";
import { toInboxRow } from "./toInboxRow";
import * as css from "./approvalInbox.css";

type Tab = "pending" | "processed";

function TypeBadge({ typeLabel, myType }: { typeLabel: string; myType: ApprovalInboxItem["myType"] }) {
  const variant = myType === "agree" ? css.badge.agree : css.badge.kind;
  return <span className={variant}>{typeLabel}</span>;
}

function ResultBadge({ myStatus, myStatusLabel }: { myStatus: ApprovalInboxItem["myStatus"]; myStatusLabel: string }) {
  const variant =
    myStatus === "approved" ? css.badge.approved : myStatus === "rejected" ? css.badge.rejected : css.badge.neutral;
  return <span className={variant}>{myStatusLabel}</span>;
}

export function ApprovalInboxPage() {
  const navigate = useNavigate();
  const { pending, processed, isLoading } = useApprovalInbox();
  const [tab, setTab] = useState<Tab>("pending");

  const items = tab === "pending" ? pending : processed;
  const rows = items.map((item) => ({ item, row: toInboxRow(item) }));

  return (
    <div>
      <div className={css.phead}>
        <div>
          <Eyebrow>결재</Eyebrow>
          <h1 className={css.title}>결재 대기함</h1>
        </div>
      </div>

      <div className={css.card}>
        <div className={css.tabs}>
          <button
            type="button"
            className={cx(css.tab, tab === "pending" && css.tabOn)}
            onClick={() => setTab("pending")}
          >
            내 차례
            <span className={css.tabCount}>{pending.length}</span>
          </button>
          <button
            type="button"
            className={cx(css.tab, tab === "processed" && css.tabOn)}
            onClick={() => setTab("processed")}
          >
            처리한 결재
          </button>
        </div>

        {!isLoading && rows.length === 0 && (
          <div className={css.empty}>
            {tab === "pending" ? "처리할 결재가 없습니다" : "처리한 결재가 없습니다"}
          </div>
        )}

        {rows.length > 0 && (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th className={css.th}>문서</th>
                  <th className={css.th}>결재 유형</th>
                  <th className={css.th}>상신자</th>
                  <th className={css.th}>{tab === "pending" ? "내 단계" : "처리 결과"}</th>
                  <th className={css.th}>상신일</th>
                  <th className={css.th} />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, row }) => (
                  <tr key={row.lineId} className={tab === "pending" ? css.rowHot : undefined}>
                    <td className={css.td}>
                      <div>
                        <span className={css.docTitle} onClick={() => navigate(row.href)}>
                          {tab === "pending" && <span className={css.liveDot} />}
                          {row.title}
                        </span>
                        <div className={css.docMeta}>{row.kindLabel}</div>
                      </div>
                    </td>
                    <td className={css.td}>
                      <TypeBadge typeLabel={row.typeLabel} myType={item.myType} />
                    </td>
                    <td className={css.td}>
                      <div className={css.person}>
                        <Avatar size="sm" color="primary" initials={row.submittedByName[0]} />
                        <div>
                          <div className={css.personName}>{row.submittedByName}</div>
                          <div className={css.personDept}>{row.submittedByDept}</div>
                        </div>
                      </div>
                    </td>
                    <td className={css.td}>
                      {tab === "pending" ? (
                        <span className={css.stepPos}>{row.stepLabel}</span>
                      ) : (
                        <ResultBadge myStatus={row.myStatus} myStatusLabel={row.myStatusLabel} />
                      )}
                    </td>
                    <td className={css.td}>{row.submittedAtLabel}</td>
                    <td className={css.td}>
                      {tab === "pending" && (
                        <Button size="small" onClick={() => navigate(row.href)}>
                          처리
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
