import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import "./style.css";
import { App } from "./App";

document.body.classList.add(lightThemeClass);

createRoot(document.getElementById("app")!).render(
  <BrowserRouter>
    <div className={lightThemeClass} style={{ minHeight: "100vh" }}>
      <App />
    </div>
  </BrowserRouter>,
);
