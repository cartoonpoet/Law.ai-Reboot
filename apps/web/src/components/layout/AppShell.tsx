import { Outlet } from "react-router-dom";
import { AiAssistant } from "../assistant/AiAssistant";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { RouteErrorBoundary } from "../feedback/RouteErrorBoundary";

export function AppShell() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <TopBar />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "22px 24px 48px",
          }}
        >
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
      <AiAssistant />
    </div>
  );
}
