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
import { SystemSettingsPage } from "./pages/system/SystemSettingsPage";
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
        <Route path="/contract/list" element={<ContractListPage />} />
        <Route path="/contract/request" element={<ContractCreatePage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/system" element={<SystemSettingsPage />} />
        <Route path="/approvals/inbox" element={<ApprovalInboxPage />} />
        <Route path="/contract/:id/edit" element={<ContractEditPage />} />
        <Route path="/contract/:id" element={<ContractDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
