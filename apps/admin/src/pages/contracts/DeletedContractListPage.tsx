import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Spinner, themeVars } from "@lawkit/ui";
import type { AdminDeletedContractItem, ContractStatus } from "@lawai/contracts";
import { AdminShell } from "../../components/AdminShell";
import { listDeletedContracts, restoreContract } from "../../api/adminContracts";
import { formatRelative } from "../tenants/tenantLabels";

const DELETED_CONTRACTS_QUERY_KEY = ["adminDeletedContracts"] as const;

// 삭제되기 직전 상태 — 웹 화면(apps/web contractStatus.ts)과 같은 이름을 쓴다.
const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "임시 저장",
  unassigned: "미배정",
  assigning: "배정 중",
  legalReview: "법무 검토 중",
  requesterReview: "요청자 검토 중",
  reviewDone: "검토 완료",
  signing: "체결 진행",
  signed: "체결 완료",
  fulfilling: "계약 이행",
  closed: "계약 종료",
};

const intro: React.CSSProperties = {
  fontSize: 12.5,
  color: themeVars.color.textSecondary,
  margin: "0 0 14px",
};
const notice: React.CSSProperties = {
  fontSize: 12.5,
  color: themeVars.color.accentSuccess,
  margin: "0 0 12px",
};
const tableWrap: React.CSSProperties = {
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  overflow: "auto",
};
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 700,
  color: themeVars.color.textSecondary,
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  background: themeVars.color.neutralSurfaceAlt,
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "11px 14px",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  fontSize: 12.5,
  color: themeVars.color.textPrimary,
};
const titleText: React.CSSProperties = { fontWeight: 700, color: themeVars.color.textHeading };
const codeText: React.CSSProperties = {
  fontSize: 11.5,
  color: themeVars.color.textMuted,
  fontVariantNumeric: "tabular-nums",
};
const emptyCell: React.CSSProperties = { ...td, textAlign: "center", color: themeVars.color.textSecondary, padding: 28 };
const errorText: React.CSSProperties = { fontSize: 12, color: themeVars.color.accentDanger, marginTop: 10 };

export function DeletedContractListPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: DELETED_CONTRACTS_QUERY_KEY, queryFn: listDeletedContracts });
  const [target, setTarget] = useState<AdminDeletedContractItem | null>(null);
  const [restoredTitle, setRestoredTitle] = useState<string | null>(null);

  const restoreMutation = useMutation({
    mutationFn: (item: AdminDeletedContractItem) => restoreContract(item.id),
    onSuccess: (_result, item) => {
      setTarget(null);
      setRestoredTitle(item.title);
      void queryClient.invalidateQueries({ queryKey: DELETED_CONTRACTS_QUERY_KEY });
    },
  });

  const handleOpenRestore = (item: AdminDeletedContractItem) => {
    restoreMutation.reset();
    setRestoredTitle(null);
    setTarget(item);
  };

  if (query.isLoading) {
    return (
      <AdminShell breadcrumbLabel="삭제된 계약">
        <Spinner label="불러오는 중..." />
      </AdminShell>
    );
  }
  if (!query.data) {
    return (
      <AdminShell breadcrumbLabel="삭제된 계약">
        <div style={{ color: themeVars.color.textSecondary }}>삭제된 계약 목록을 불러오지 못했습니다.</div>
      </AdminShell>
    );
  }

  const items = query.data.items;

  return (
    <AdminShell breadcrumbLabel="삭제된 계약">
      <p style={intro}>
        사용자가 삭제한 계약입니다(최근 삭제 순). 복구하면 그 회사의 계약 목록·검색·대시보드와 알림 링크에서 다시 열 수 있어요.
      </p>
      {restoredTitle ? <p style={notice}>‘{restoredTitle}’ 계약을 복구했어요.</p> : null}

      <div style={tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>계약</th>
              <th style={th}>회사</th>
              <th style={th}>삭제 전 상태</th>
              <th style={th}>작성자</th>
              <th style={th}>삭제한 사람</th>
              <th style={th}>삭제 시각</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td style={emptyCell} colSpan={7}>
                  삭제된 계약이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td style={td}>
                    <div style={titleText}>{item.title}</div>
                    <div style={codeText}>{item.code}</div>
                  </td>
                  <td style={td}>{item.tenantName || "-"}</td>
                  <td style={td}>{CONTRACT_STATUS_LABELS[item.status]}</td>
                  <td style={td}>{item.createdByName ?? "-"}</td>
                  <td style={td}>{item.deletedByName ?? "-"}</td>
                  <td style={td} title={new Date(item.deletedAt).toLocaleString("ko-KR")}>
                    {formatRelative(item.deletedAt)}
                  </td>
                  <td style={td}>
                    <Button size="small" variant="outline" color="secondary" onClick={() => handleOpenRestore(item)}>
                      복구
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title="계약 복구"
        footer={
          <>
            <Button variant="outline" color="secondary" onClick={() => setTarget(null)}>
              취소
            </Button>
            <Button
              disabled={restoreMutation.isPending || target === null}
              onClick={() => target && restoreMutation.mutate(target)}
            >
              {restoreMutation.isPending ? "복구 중…" : "복구"}
            </Button>
          </>
        }
      >
        {target ? (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            {target.tenantName || "이 회사"}의 <b>{target.title}</b>({target.code}) 계약을 복구합니다. 삭제 전 상태(
            {CONTRACT_STATUS_LABELS[target.status]})로 다시 보이게 돼요.
            {restoreMutation.isError ? (
              <div style={errorText}>
                {restoreMutation.error instanceof Error ? restoreMutation.error.message : "복구하지 못했습니다."}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
