import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Dropdown,
  Input,
  InputGroup,
  Modal,
  Spinner,
  themeVars,
} from "@lawkit/ui";
import type { TenantPlan, TenantStatus } from "@lawai/contracts";
import { AdminShell } from "../../components/AdminShell";
import { getAdminTenant, updateAdminTenant } from "../../api/adminTenants";
import {
  PLAN_LABELS,
  STATUS_LABELS,
  getTenantRoleLabelAdmin,
} from "./tenantLabels";

const DEFAULT_TRIAL_DAYS = 30;

const formatBytes = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}GB`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}KB`;
  return `${n}B`;
};

const card: React.CSSProperties = {
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
};
const cardHead: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  fontSize: 13.5,
  fontWeight: 700,
  color: themeVars.color.textHeading,
};

export function TenantDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["adminTenant", id],
    queryFn: () => getAdminTenant(id),
  });

  const [openDialog, setOpenDialog] = useState<"plan" | "status" | null>(null);
  const [planDraft, setPlanDraft] = useState<TenantPlan | null>(null);
  const [statusDraft, setStatusDraft] = useState<TenantStatus | null>(null);
  const [trialEndsDraft, setTrialEndsDraft] = useState("");

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof updateAdminTenant>[1]) =>
      updateAdminTenant(id, body),
    onSuccess: () => {
      setOpenDialog(null);
      void queryClient.invalidateQueries({ queryKey: ["adminTenant", id] });
      void queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
    },
  });

  if (query.isLoading) {
    return (
      <AdminShell breadcrumbLabel="고객사">
        <Spinner label="불러오는 중..." />
      </AdminShell>
    );
  }
  const data = query.data;
  if (!data) {
    return (
      <AdminShell breadcrumbLabel="고객사">
        <div style={{ color: themeVars.color.textSecondary }}>
          고객사를 찾을 수 없습니다.
        </div>
      </AdminShell>
    );
  }
  const { tenant, stats, roleBreakdown, recentAudit } = data;
  const maxRoleCount = Math.max(1, ...roleBreakdown.map((r) => r.count));

  const handleOpenStatusDialog = () => {
    setStatusDraft(tenant.status === "suspended" ? "active" : "suspended");
    setTrialEndsDraft(
      new Date(Date.now() + DEFAULT_TRIAL_DAYS * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    setOpenDialog("status");
  };

  const handleSubmitStatus = () => {
    if (!statusDraft) return;
    mutation.mutate({
      status: statusDraft,
      trialEndsAt:
        statusDraft === "trial"
          ? new Date(`${trialEndsDraft}T23:59:59Z`).toISOString()
          : null,
    });
  };

  return (
    <AdminShell breadcrumbLabel={`고객사 / ${tenant.name}`}>
      <button
        onClick={() => navigate("/tenants")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: themeVars.color.accentPrimary,
          fontWeight: 700,
          fontSize: 12.5,
          padding: 0,
          marginBottom: 8,
        }}
      >
        ‹ 고객사 목록
      </button>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Avatar initials={tenant.name.charAt(0)} size="md" color="primary" />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: themeVars.color.textHeading }}>
            {tenant.name}
          </div>
          <div style={{ fontSize: 12, color: themeVars.color.textSecondary }}>
            가입 {new Date(tenant.createdAt).toLocaleDateString("ko-KR")} ·{" "}
            {PLAN_LABELS[tenant.plan]} · {STATUS_LABELS[tenant.status]}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button
          variant="outline"
          color="secondary"
          onClick={() => {
            setPlanDraft(tenant.plan);
            setOpenDialog("plan");
          }}
        >
          요금제 변경
        </Button>
        <Button
          color={tenant.status === "suspended" ? "primary" : "danger"}
          onClick={handleOpenStatusDialog}
        >
          {tenant.status === "suspended" ? "정지 해제" : "이용 정지"}
        </Button>
      </div>

      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          ["멤버", String(stats.memberCount)],
          ["진행 중 계약", String(stats.activeContracts)],
          ["체결 완료", String(stats.signedContracts)],
          ["저장 용량", formatBytes(stats.storageBytes)],
        ].map(([label, value]) => (
          <div key={label} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: themeVars.color.textSecondary }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: themeVars.color.textHeading, marginTop: 4 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        {/* 역할별 멤버 구성 */}
        <div style={card}>
          <div style={cardHead}>역할별 멤버 구성</div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {roleBreakdown.length === 0 ? (
              <div style={{ fontSize: 12, color: themeVars.color.textSecondary }}>
                멤버가 없습니다.
              </div>
            ) : (
              roleBreakdown.map((r) => (
                <div
                  key={r.role}
                  style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}
                >
                  <span
                    style={{
                      width: 92,
                      color: themeVars.color.textSecondary,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {getTenantRoleLabelAdmin(r.role)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 14,
                      background: themeVars.color.neutralSurfaceAlt,
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(r.count / maxRoleCount) * 100}%`,
                        background: themeVars.color.accentPrimary,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: 34,
                      textAlign: "right",
                      fontWeight: 700,
                      color: themeVars.color.textHeading,
                    }}
                  >
                    {r.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 최근 활동 */}
        <div style={card}>
          <div style={cardHead}>최근 활동 (이 회사만)</div>
          {recentAudit.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: themeVars.color.textSecondary }}>
              최근 활동이 없습니다.
            </div>
          ) : (
            recentAudit.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 16px",
                  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
                  fontSize: 12,
                  alignItems: "baseline",
                  color: themeVars.color.textPrimary,
                }}
              >
                <span
                  style={{ color: themeVars.color.textSecondary, width: 90, flexShrink: 0 }}
                >
                  {new Date(a.at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>
                  {a.actorName ?? a.actorId} — {a.action} {a.targetType}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 요금제 변경 다이얼로그 */}
      <Modal
        open={openDialog === "plan"}
        onClose={() => setOpenDialog(null)}
        title="요금제 변경"
        footer={
          <>
            <Button variant="outline" color="secondary" onClick={() => setOpenDialog(null)}>
              취소
            </Button>
            <Button
              disabled={mutation.isPending || !planDraft}
              onClick={() => planDraft && mutation.mutate({ plan: planDraft })}
            >
              변경
            </Button>
          </>
        }
      >
        <Dropdown
          options={[
            { value: "starter", label: "Starter" },
            { value: "pro", label: "Pro" },
            { value: "enterprise", label: "Enterprise" },
          ]}
          value={planDraft ?? tenant.plan}
          onChange={(v) => setPlanDraft(v as TenantPlan)}
        />
      </Modal>

      {/* 상태 변경 다이얼로그 */}
      <Modal
        open={openDialog === "status"}
        onClose={() => setOpenDialog(null)}
        title="상태 변경"
        footer={
          <>
            <Button variant="outline" color="secondary" onClick={() => setOpenDialog(null)}>
              취소
            </Button>
            <Button disabled={mutation.isPending} onClick={handleSubmitStatus}>
              적용
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Dropdown
            options={[
              { value: "active", label: "사용 중", description: "정상 이용" },
              { value: "trial", label: "체험판", description: "만료일까지 무료 이용" },
              {
                value: "suspended",
                label: "정지",
                description: "이 회사 멤버의 로그인·전환이 차단됩니다",
              },
            ]}
            value={statusDraft ?? tenant.status}
            onChange={(v) => setStatusDraft(v as TenantStatus)}
          />
          {statusDraft === "trial" ? (
            <InputGroup label="체험판 만료일" helperText="YYYY-MM-DD">
              <Input
                value={trialEndsDraft}
                onChange={(e) => setTrialEndsDraft(e.target.value)}
                placeholder="2026-10-10"
              />
            </InputGroup>
          ) : null}
          {mutation.isError ? (
            <div style={{ fontSize: 12, color: themeVars.color.accentDanger }}>
              변경에 실패했습니다. 다시 시도해주세요.
            </div>
          ) : null}
        </div>
      </Modal>
    </AdminShell>
  );
}
