import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import "./style.css";
import { App } from "./App";
import { queryClient } from "./lib/queryClient";

document.body.classList.add(lightThemeClass);

createRoot(document.getElementById("app")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <div className={lightThemeClass} style={{ minHeight: "100vh" }}>
        <App />
      </div>
    </BrowserRouter>
  </QueryClientProvider>,
);
