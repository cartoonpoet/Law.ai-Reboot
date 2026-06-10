import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/login/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ContractPlaceholderPage } from "./pages/contract/ContractPlaceholderPage";

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
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/contract/list" element={<ContractPlaceholderPage title="계약서 검토 조회" />} />
        <Route path="/contract/request" element={<ContractPlaceholderPage title="계약서 검토 요청" />} />
        <Route path="/contract/signed" element={<ContractPlaceholderPage title="체결 계약 조회" />} />
        <Route path="/contract/expire" element={<ContractPlaceholderPage title="체결계약 만료 현황" />} />
        <Route path="/contract/:id" element={<ContractPlaceholderPage title="계약서 상세" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
