import { Outlet } from "react-router-dom";
import { AiAssistant } from "../assistant/AiAssistant";
import { AssistantProvider } from "../assistant/AssistantProvider";
import { RouteErrorBoundary } from "../feedback/RouteErrorBoundary";
import { CommandPalette } from "../search/CommandPalette";
import { CommandPaletteProvider } from "../search/CommandPaletteProvider";
import { Sidebar } from "./Sidebar";
import * as css from "./appShell.css";

// 앱 틀 — 사이드바 + 본문. 상단 헤더 없이 알림은 AI 비서, 설정은 내 이름 메뉴, 검색은 Ctrl+K 검색창.
export function AppShell() {
  return (
    <AssistantProvider>
      <CommandPaletteProvider>
        <div className={css.shell}>
          <Sidebar />
          <main className={css.main}>
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </main>
          <AiAssistant />
          <CommandPalette />
        </div>
      </CommandPaletteProvider>
    </AssistantProvider>
  );
}
