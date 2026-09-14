import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AiModelOption } from "@lawai/contracts";
import { MemoryRouter } from "react-router-dom";
import { SystemSettingsPage } from "./SystemSettingsPage";
import * as aiApi from "../../api/ai";
import { ApiError } from "../../api/apiError";
import { createQueryClient } from "../../lib/queryClient";
import { RouteErrorBoundary } from "../../components/feedback/RouteErrorBoundary";

// api/ai 계층에서만 mock 한다(ContractDetailPage.test.tsx 와 같은 층위) — useMyAiCredential
// 훅과 react-query 배선은 실제로 돌려서, 훅이나 API 모듈이 깨지면 이 테스트가 잡는다.
vi.mock("../../api/ai");

// 모델 목록의 유일한 출처는 ai-service 의 OpenAiProvider 다. 픽스처를 따로 지어내면
// 프로덕션이 실존하지 않는 모델 ID 를 서빙해도 테스트는 통과해버린다(실제로 그랬다).
// 그래서 픽스처를 공급자 파일에서 직접 읽어, 두 곳이 따로 놀 수 없게 만든다.
// (목록 자체의 고정 검증은 services/ai-service 의 openai.provider.spec.ts 가 담당한다.)
const OPENAI_PROVIDER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../../services/ai-service/src/providers/openai.provider.ts",
);

const readProviderModels = (): AiModelOption[] => {
  const source = readFileSync(OPENAI_PROVIDER_PATH, "utf8");
  const entries = [
    ...source.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*tier:\s*"([^"]+)"\s*\}/g),
  ];
  if (entries.length === 0) {
    throw new Error(`OpenAiProvider 의 MODEL_OPTIONS 를 읽지 못했습니다: ${OPENAI_PROVIDER_PATH}`);
  }
  return entries.map(([, id, label, tier]) => ({ id, label, tier } as AiModelOption));
};

const MODELS = readProviderModels();
const STANDARD_MODEL_ID = MODELS.find((m) => m.tier === "standard")!.id;

const savedCredential = {
  provider: "openai",
  model: STANDARD_MODEL_ID,
  hasApiKey: true,
  lastVerifiedAt: "2026-09-12T00:00:00.000Z",
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SystemSettingsPage />
    </QueryClientProvider>,
  );
};

describe("SystemSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aiApi.getMyAiCredential).mockResolvedValue(null);
    vi.mocked(aiApi.getAiModels).mockResolvedValue({ models: MODELS });
    vi.mocked(aiApi.saveMyAiCredential).mockResolvedValue(savedCredential);
  });

  it("ai-service 가 서빙하는 모델 목록은 실제 OpenAI 모델 ID 여야 한다", () => {
    // 가상의 ID(gpt-mini 등)가 되살아나면 프로바이더 호출이 전부 404 가 된다.
    expect(MODELS.length).toBeGreaterThan(0);
    expect(MODELS.filter((m) => m.tier === "standard")).toHaveLength(1);
    for (const model of MODELS) {
      expect(model.id).toMatch(/^gpt-4/);
    }
  });

  it("미설정 상태를 렌더한다", async () => {
    renderPage();
    expect(await screen.findByText("미설정")).toBeInTheDocument();
    expect(screen.getByText("내 AI 연동")).toBeInTheDocument();
  });

  it("연동된 상태를 렌더한다", async () => {
    vi.mocked(aiApi.getMyAiCredential).mockResolvedValue(savedCredential);
    renderPage();
    expect(await screen.findByText("정상")).toBeInTheDocument();
  });

  it("자격증명 조회가 실패하면 앱 에러 경계가 본문을 오류 페이지로 바꾼다", async () => {
    vi.mocked(aiApi.getMyAiCredential).mockRejectedValue(new ApiError(503, "점검 중입니다"));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <RouteErrorBoundary>
            <SystemSettingsPage />
          </RouteErrorBoundary>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("일시적인 오류가 발생했어요", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText("점검 중입니다")).toBeInTheDocument();
  });

  it("API 키 없이 저장하면 저장 요청을 보내지 않고 에러를 보여준다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "저장" }));
    expect(aiApi.saveMyAiCredential).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("API 키를 입력하세요.");
  });

  it("저장 시 기본 선택 모델(표준 등급)로 API 를 호출한다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByPlaceholderText("sk-..."), "sk-test-key-1234");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(aiApi.saveMyAiCredential).toHaveBeenCalledWith({
      provider: "openai",
      model: STANDARD_MODEL_ID,
      apiKey: "sk-test-key-1234",
    });
  });

  it("저장 실패 시 서버가 준 사유를 그대로 보여준다", async () => {
    const user = userEvent.setup();
    vi.mocked(aiApi.saveMyAiCredential).mockRejectedValue(
      new Error("API 키 검증에 실패했습니다: OpenAI 인증 실패(401)"),
    );
    renderPage();
    await user.type(await screen.findByPlaceholderText("sk-..."), "sk-invalid-key");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("OpenAI 인증 실패(401)");
  });
});
