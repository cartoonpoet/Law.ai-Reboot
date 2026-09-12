import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemSettingsPage } from "./SystemSettingsPage";
import { useMyAiCredential } from "./hooks/useMyAiCredential";

vi.mock("./hooks/useMyAiCredential");

const MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", tier: "economy" as const },
  { id: "gpt-4o", label: "GPT-4o", tier: "standard" as const },
  { id: "gpt-4.1", label: "GPT-4.1", tier: "precision" as const },
];

const mockHook = (over: Partial<ReturnType<typeof useMyAiCredential>> = {}) => {
  const save = vi.fn().mockResolvedValue({
    provider: "openai",
    model: "gpt-4o",
    hasApiKey: true,
    lastVerifiedAt: "2026-09-12T00:00:00.000Z",
  });
  vi.mocked(useMyAiCredential).mockReturnValue({
    credential: null,
    isLoading: false,
    isError: false,
    models: MODELS,
    save,
    isSaving: false,
    ...over,
  });
  return { save };
};

describe("SystemSettingsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미설정 상태를 렌더한다", () => {
    mockHook();
    render(<SystemSettingsPage />);
    expect(screen.getByText("미설정")).toBeInTheDocument();
    expect(screen.getByText("내 AI 연동")).toBeInTheDocument();
  });

  it("연동된 상태를 렌더한다", () => {
    mockHook({
      credential: {
        provider: "openai",
        model: "gpt-4o",
        hasApiKey: true,
        lastVerifiedAt: "2026-09-12T00:00:00.000Z",
      },
    });
    render(<SystemSettingsPage />);
    expect(screen.getByText("정상")).toBeInTheDocument();
  });

  it("API 키 없이 저장하면 save 를 호출하지 않고 에러를 보여준다", async () => {
    const user = userEvent.setup();
    const { save } = mockHook();
    render(<SystemSettingsPage />);
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(save).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("API 키를 입력하세요.");
  });

  it("저장 성공 시 save 를 올바른 값으로 호출한다", async () => {
    const user = userEvent.setup();
    const { save } = mockHook();
    render(<SystemSettingsPage />);
    const apiKeyInput = screen.getByPlaceholderText("sk-...");
    await user.type(apiKeyInput, "sk-test-key-1234");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(save).toHaveBeenCalledWith({
      provider: "openai",
      model: "gpt-4o",
      apiKey: "sk-test-key-1234",
    });
  });

  it("저장 실패 시 에러 메시지를 보여준다", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockRejectedValue(new Error("API 키가 올바르지 않습니다"));
    mockHook({ save });
    render(<SystemSettingsPage />);
    const apiKeyInput = screen.getByPlaceholderText("sk-...");
    await user.type(apiKeyInput, "sk-invalid-key");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("API 키가 올바르지 않습니다");
  });
});
