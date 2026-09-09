import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Dropdown,
  Icon,
  Input,
  InputGroup,
  Modal,
  Spinner,
  themeVars,
} from "@lawkit/ui";
import type { AdminTenantListItem, TenantPlan } from "@lawai/contracts";
import { AdminShell } from "../../components/AdminShell";
import { createAdminTenant, listAdminTenants } from "../../api/adminTenants";
import {
  PLAN_LABELS,
  STATUS_LABELS,
  formatRelative,
  getTrialDday,
} from "./tenantLabels";

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  marginBottom: 16,
};
const kpiCard: React.CSSProperties = {
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  padding: "14px 16px",
};
const kpiLabel: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: themeVars.color.textSecondary,
};
const kpiValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: themeVars.color.textHeading,
  marginTop: 4,
};
const tableWrap: React.CSSProperties = {
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  overflow: "hidden",
};
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 700,
  color: themeVars.color.textSecondary,
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  background: themeVars.color.neutralSurfaceAlt,
};
const td: React.CSSProperties = {
  padding: "11px 14px",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  fontSize: 12.5,
  color: themeVars.color.textPrimary,
};

const DEFAULT_TRIAL_DAYS = 30;

export function TenantListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["adminTenants"], queryFn: listAdminTenants });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [planDraft, setPlanDraft] = useState<TenantPlan>("starter");
  const [statusDraft, setStatusDraft] = useState<"trial" | "active">("trial");
  const [trialEndsDraft, setTrialEndsDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminTenant({
        name: nameDraft.trim(),
        plan: planDraft,
        status: statusDraft,
        trialEndsAt:
          statusDraft === "trial"
            ? new Date(`${trialEndsDraft}T23:59:59Z`).toISOString()
            : null,
        managerEmail: emailDraft.trim(),
      }),
    onSuccess: () => {
      setIsCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
    },
  });

  const handleOpenCreate = () => {
    setNameDraft("");
    setPlanDraft("starter");
    setStatusDraft("trial");
    setTrialEndsDraft(
      new Date(Date.now() + DEFAULT_TRIAL_DAYS * 86_400_000).toISOString().slice(0, 10),
    );
    setEmailDraft("");
    setIsCreateOpen(true);
  };

  const isCreateValid = nameDraft.trim().length > 0 && emailDraft.includes("@");

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
          고객사 목록을 불러오지 못했습니다.
        </div>
      </AdminShell>
    );
  }

  const nearestTrial = data.tenants
    .filter((t) => t.status === "trial" && t.trialEndsAt)
    .sort((a, b) => a.trialEndsAt!.localeCompare(b.trialEndsAt!))[0];

  return (
    <AdminShell
      breadcrumbLabel="고객사"
      topbarExtra={<Button onClick={handleOpenCreate}>+ 고객사 추가</Button>}
    >
      <div style={kpiGrid}>
        <div style={kpiCard}>
          <div style={kpiLabel}>전체 고객사</div>
          <div style={kpiValue}>{data.totals.tenants}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>전체 사용자</div>
          <div style={kpiValue}>{data.totals.users}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>전체 계약</div>
          <div style={kpiValue}>{data.totals.contracts}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>체험판(전환 대기)</div>
          <div style={kpiValue}>{data.totals.trials}</div>
          {nearestTrial ? (
            <div style={{ fontSize: 11, color: themeVars.color.textSecondary, marginTop: 2 }}>
              {nearestTrial.name} · {getTrialDday(nearestTrial.trialEndsAt)}
            </div>
          ) : null}
        </div>
      </div>

      <div style={tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>회사</th>
              <th style={th}>요금제</th>
              <th style={th}>상태</th>
              <th style={th}>멤버</th>
              <th style={th}>계약</th>
              <th style={th}>최근 활동</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {data.tenants.map((t: AdminTenantListItem) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tenants/${t.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td style={td}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 700,
                      color: themeVars.color.textHeading,
                    }}
                  >
                    <Avatar initials={t.name.charAt(0)} size="sm" color="primary" />
                    {t.name}
                  </span>
                </td>
                <td style={td}>{PLAN_LABELS[t.plan]}</td>
                <td style={td}>
                  {STATUS_LABELS[t.status]}
                  {t.status === "trial" && t.trialEndsAt
                    ? ` · ${getTrialDday(t.trialEndsAt)}`
                    : ""}
                </td>
                <td style={td}>{t.memberCount}</td>
                <td style={td}>{t.contractCount}</td>
                <td style={td}>{formatRelative(t.lastActivityAt)}</td>
                <td style={td}>
                  <Icon name="chevronRight" size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 고객사 생성 다이얼로그 (온보딩 1단계) */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="새 고객사 추가"
        footer={
          <>
            <Button variant="outline" color="secondary" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button
              disabled={createMutation.isPending || !isCreateValid}
              onClick={() => createMutation.mutate()}
            >
              회사 생성 + 초대 메일 발송
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <InputGroup label="회사 이름" required>
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="D물산"
            />
          </InputGroup>
          <InputGroup label="요금제" required>
            <Dropdown
              options={[
                { value: "starter", label: "Starter" },
                { value: "pro", label: "Pro" },
                { value: "enterprise", label: "Enterprise" },
              ]}
              value={planDraft}
              onChange={(v) => setPlanDraft(v as TenantPlan)}
            />
          </InputGroup>
          <InputGroup label="시작 상태" required>
            <Dropdown
              options={[
                { value: "trial", label: "체험판", description: "만료일까지 무료 이용" },
                { value: "active", label: "바로 사용", description: "계약 완료 시" },
              ]}
              value={statusDraft}
              onChange={(v) => setStatusDraft(v as "trial" | "active")}
            />
          </InputGroup>
          {statusDraft === "trial" ? (
            <InputGroup label="체험판 만료일" helperText="YYYY-MM-DD">
              <Input
                value={trialEndsDraft}
                onChange={(e) => setTrialEndsDraft(e.target.value)}
                placeholder="2026-10-10"
              />
            </InputGroup>
          ) : null}
          <InputGroup label="첫 담당자 이메일" required helperText="계약담당자 역할로 초대 메일이 발송됩니다">
            <Input
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="legal-lead@example.com"
            />
          </InputGroup>
          {createMutation.isError ? (
            <div style={{ fontSize: 12, color: themeVars.color.accentDanger }}>
              생성에 실패했습니다. 다시 시도해주세요.
            </div>
          ) : null}
        </div>
      </Modal>
    </AdminShell>
  );
}
