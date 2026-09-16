import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

export default defineConfig({
  // 새 화면 스타일은 vanilla-extract(*.css.ts) + lawkit 토큰으로 쓴다(웹앱과 같은 방식).
  plugins: [react(), vanillaExtractPlugin()],
});
