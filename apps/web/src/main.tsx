import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import "./style.css";
import { AppRoutes } from "./routes";

const queryClient = new QueryClient();

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
