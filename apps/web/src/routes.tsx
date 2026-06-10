import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/login/LoginPage";
import { ForgotPasswordPage } from "./pages/login/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/login/ResetPasswordPage";
import { SignupPage } from "./pages/login/SignupPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ContractPlaceholderPage } from "./pages/contract/ContractPlaceholderPage";
import { ContractListPage } from "./pages/contract/ContractListPage";
import { ContractDetailPage } from "./pages/contract/ContractDetailPage";
import { ContractRequestPage } from "./pages/contract/ContractRequestPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("accessToken")) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/contract/list" element={<ContractListPage />} />
        <Route path="/contract/request" element={<ContractRequestPage />} />
        <Route path="/contract/signed" element={<ContractPlaceholderPage title="체결 계약 조회" />} />
        <Route path="/contract/expire" element={<ContractPlaceholderPage title="체결계약 만료 현황" />} />
        <Route path="/contract/:id" element={<ContractDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
