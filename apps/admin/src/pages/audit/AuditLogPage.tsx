import { Button, DatePicker, Dropdown, Input, Pagination, Spinner } from "@lawkit/ui";
import { AdminShell } from "../../components/layout/AdminShell";
import { formatRelative } from "../tenants/tenantLabels";
import {
  AUDIT_ACTION_OPTIONS,
  formatAuditTime,
  getAuditActionLabel,
  getAuditDetailSummary,
  getAuditTargetLabel,
} from "./auditLabels";
import { useAuditLogSearch } from "./hooks/useAuditLogSearch";
import * as css from "./AuditLogPage.css";

export const AuditLogPage = () => {
  const {
    filter,
    changeFilter,
    actorNameDraft,
    setActorNameDraft,
    handleSearchActorName,
    handleReset,
    page,
    setPage,
    totalPages,
    total,
    tenantOptions,
    auditQuery,
  } = useAuditLogSearch();

  const items = auditQuery.data?.items ?? [];
  const isFailed = !auditQuery.isLoading && auditQuery.error !== null;
  const isReady = !auditQuery.isLoading && auditQuery.error === null;

  return (
    <AdminShell title="감사 로그"
      description="시스템 전체의 기록입니다. 누가 무엇을 언제 했는지 찾아볼 수 있어요.">
      <p className={css.intro}>
        계약을 만들고·고치고·지우고·상태를 바꾸고·열어본 기록입니다(최근 순). 기간·회사·행위·사람으로 걸러 볼 수 있어요.
      </p>

      <div className={css.filterBar}>
        <div className={css.filterField}>
          <span className={css.filterLabel}>시작일</span>
          <DatePicker value={filter.from} onChange={(from) => changeFilter({ from })} />
        </div>
        <div className={css.filterField}>
          <span className={css.filterLabel}>종료일</span>
          <DatePicker value={filter.to} onChange={(to) => changeFilter({ to })} />
        </div>
        <div className={css.filterField}>
          <span className={css.filterLabel}>회사</span>
          <Dropdown
            options={tenantOptions}
            value={filter.tenantId}
            onChange={(tenantId) => changeFilter({ tenantId: String(tenantId) })}
          />
        </div>
        <div className={css.filterField}>
          <span className={css.filterLabel}>행위</span>
          <Dropdown
            options={AUDIT_ACTION_OPTIONS}
            value={filter.action}
            onChange={(action) => changeFilter({ action: String(action) })}
          />
        </div>
        <div className={css.filterField}>
          <span className={css.filterLabel}>사람 이름</span>
          <Input
            value={actorNameDraft}
            placeholder="이름 일부"
            aria-label="사람 이름으로 찾기"
            onChange={(event) => setActorNameDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSearchActorName()}
          />
        </div>
        <Button onClick={handleSearchActorName}>검색</Button>
        <Button variant="outline" color="secondary" onClick={handleReset}>
          초기화
        </Button>
      </div>

      {auditQuery.isLoading && <Spinner label="불러오는 중..." />}

      {isFailed && (
        <p className={css.errorText}>
          {auditQuery.error instanceof Error
            ? auditQuery.error.message
            : "감사 로그를 불러오지 못했습니다."}
        </p>
      )}

      {isReady && (
        <>
          <p className={css.resultCount}>{total.toLocaleString("ko-KR")}건</p>
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th className={css.th}>시각</th>
                  <th className={css.th}>행위</th>
                  <th className={css.th}>한 사람</th>
                  <th className={css.th}>회사</th>
                  <th className={css.th}>대상</th>
                  <th className={css.th}>세부 내용</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className={css.emptyCell} colSpan={6}>
                      조건에 맞는 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((entry) => (
                    <tr key={entry.id}>
                      <td className={css.timeCell} title={formatAuditTime(entry.at)}>
                        {formatRelative(entry.at)}
                      </td>
                      <td className={css.actionCell}>{getAuditActionLabel(entry.action)}</td>
                      <td className={css.td}>{entry.actorName ?? entry.actorId}</td>
                      <td className={css.td}>{entry.tenantName ?? "-"}</td>
                      <td className={css.td}>
                        <div className={css.targetTitle}>{entry.targetTitle ?? entry.targetId}</div>
                        <div className={css.mutedText}>{getAuditTargetLabel(entry.targetType)}</div>
                      </td>
                      <td className={css.td}>{getAuditDetailSummary(entry.detail)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={css.pagerRow}>
            <Pagination page={page} totalPages={totalPages} totalCount={total} onPageChange={setPage} />
          </div>
        </>
      )}
    </AdminShell>
  );
};
