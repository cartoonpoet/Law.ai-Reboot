/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// 빌드 식별자 — 새 버전 감지의 기준값. git short SHA + 빌드 시각.
// CI/로컬 모두 동일한 산출(고유성 보장). 실패 시(detached/non-git) timestamp 단독.
const resolveBuildId = (): string => {
  const ts = String(Date.now());
  try {
    const sha = execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return sha ? `${sha}-${ts}` : ts;
  } catch {
    return ts;
  }
};

const buildId = process.env.VITE_BUILD_ID ?? resolveBuildId();

export default defineConfig({
  // 앱 부팅 시점의 자기 버전(컴파일 타임 상수). 런타임 /version.json 과 비교.
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [
    react(),
    vanillaExtractPlugin(),
    {
      // 빌드 직후 dist/version.json 에 동일 buildId 를 쓴다. 프론트가 60s 마다 폴링.
      name: "emit-version-json",
      apply: "build",
      closeBundle() {
        writeFileSync(
          resolve(__dirname, "dist/version.json"),
          `${JSON.stringify({ buildId })}\n`,
        );
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
