import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import "./style.css";
import { AppRoutes } from "./routes";

const queryClient = new QueryClient();

// 테마 토큰(--surface 등)을 body에도 적용한다. lawkit Modal/Popover는 document.body로
// portal되므로, 테마 클래스가 래퍼 div에만 있으면 portal된 모달이 테마 변수를 못 받아
// 카드 배경이 투명해진다(스코프 밖). body에 적용해 portal 콘텐츠까지 커버한다.
document.body.classList.add(lightThemeClass);

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className={lightThemeClass} style={{ height: "100%" }}>
          <AppRoutes />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
