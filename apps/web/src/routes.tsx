import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AuthLayout } from "./pages/login/AuthLayout";
import { LoginPage } from "./pages/login/LoginPage";
import { ForgotPasswordPage } from "./pages/login/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/login/ResetPasswordPage";
import { SignupPage } from "./pages/login/SignupPage";
import { InviteAcceptPage } from "./pages/login/InviteAcceptPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { MembersPage } from "./pages/members/MembersPage";
import { StatsPage } from "./pages/stats/StatsPage";
import { SystemSettingsPage } from "./pages/system/SystemSettingsPage";
import { ExpiringContractsPage } from "./pages/contract/expiring/ExpiringContractsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { ContractListPage } from "./pages/contract/ContractListPage";
import { ContractDetailPage } from "./pages/contract/ContractDetailPage";
import { ContractCreatePage } from "./pages/contract/ContractCreatePage";
import { ContractEditPage } from "./pages/contract/ContractEditPage";
import { ApprovalInboxPage } from "./pages/approval/ApprovalInboxPage";
import { MockupsIndex } from "./pages/mockups/MockupsIndex";
import { PreviewModalMock } from "./pages/mockups/PreviewModalMock";
import { PreviewDrawerMock } from "./pages/mockups/PreviewDrawerMock";
import { PreviewPageMock } from "./pages/mockups/PreviewPageMock";
import { CompareDirectMock } from "./pages/mockups/CompareDirectMock";
import { CompareSwapMock } from "./pages/mockups/CompareSwapMock";
import { ComparePickerMock } from "./pages/mockups/ComparePickerMock";
import { ContractLifecycleMock } from "./pages/mockups/lifecycle/ContractLifecycleMock";
import { AdviceListPage } from "./pages/advice/list/AdviceListPage";
import { AdviceRequestPage } from "./pages/advice/request/AdviceRequestPage";
import { AdviceDetailPage } from "./pages/advice/detail/AdviceDetailPage";
import { ApprovalQueueMock } from "./pages/mockups/approvalInbox/ApprovalQueueMock";
import { ApprovalSplitMock } from "./pages/mockups/approvalInbox/ApprovalSplitMock";
import { ApprovalGroupedMock } from "./pages/mockups/approvalInbox/ApprovalGroupedMock";
import { CaseTableMock } from "./pages/mockups/litigation/CaseTableMock";
import { CaseBoardMock } from "./pages/mockups/litigation/CaseBoardMock";
import { HearingScheduleMock } from "./pages/mockups/litigation/HearingScheduleMock";
import { CaseDetailMock } from "./pages/mockups/litigation/CaseDetailMock";
import { NotFoundPage } from "./components/feedback/NotFoundPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("accessToken")) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* 시안 — AppShell 안에서 렌더(실제 사이드바/탑바), 인증은 우회 (mockup 평가용, 채택 후 삭제) */}
      <Route element={<AppShell />}>
        <Route path="/mockups" element={<MockupsIndex />} />
        <Route path="/mockups/preview-modal" element={<PreviewModalMock />} />
        <Route path="/mockups/preview-drawer" element={<PreviewDrawerMock />} />
        <Route path="/mockups/preview-page" element={<PreviewPageMock />} />
        <Route path="/mockups/compare-direct" element={<CompareDirectMock />} />
        <Route path="/mockups/compare-swap" element={<CompareSwapMock />} />
        <Route path="/mockups/compare-picker" element={<ComparePickerMock />} />
        <Route path="/mockups/contract-lifecycle" element={<ContractLifecycleMock />} />
        <Route path="/mockups/approval-inbox-a" element={<ApprovalQueueMock />} />
        <Route path="/mockups/approval-inbox-b" element={<ApprovalSplitMock />} />
        <Route path="/mockups/approval-inbox-c" element={<ApprovalGroupedMock />} />
        <Route path="/mockups/litigation-table" element={<CaseTableMock />} />
        <Route path="/mockups/litigation-board" element={<CaseBoardMock />} />
        <Route path="/mockups/litigation-hearings" element={<HearingScheduleMock />} />
        <Route path="/mockups/litigation-detail" element={<CaseDetailMock />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/invite" element={<InviteAcceptPage />} />
      </Route>
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/contract/list" element={<ContractListPage />} />
        <Route path="/contract/request" element={<ContractCreatePage />} />
        <Route path="/contract/expiring" element={<ExpiringContractsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/system" element={<SystemSettingsPage />} />
        <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/settings/:tab" element={<SettingsPage />} />
        <Route path="/advice" element={<Navigate to="/advice/list" replace />} />
        <Route path="/advice/list" element={<AdviceListPage />} />
        <Route path="/advice/request" element={<AdviceRequestPage />} />
        <Route path="/advice/:id" element={<AdviceDetailPage />} />
        <Route path="/approvals/inbox" element={<ApprovalInboxPage />} />
        <Route path="/contract/:id/edit" element={<ContractEditPage />} />
        <Route path="/contract/:id" element={<ContractDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
