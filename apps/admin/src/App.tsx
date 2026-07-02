import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/auth/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { DashboardMock } from "./pages/mockups/DashboardMock";
import { RequireAdmin } from "./components/RequireAdmin";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* 시안 — 인증 우회(평가용). 채택 후 DashboardPage 로 승격하고 삭제. */}
      <Route path="/mockups/dashboard" element={<DashboardMock />} />
      <Route
        path="/"
        element={
          <RequireAdmin>
            <DashboardPage />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
