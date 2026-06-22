import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentForm } from "./CommentForm";

// useUserSearch(→ searchUsers)로 멘션 후보를 노출. 디렉터리 검색을 목킹.
vi.mock("../../../api/directory", () => ({
  searchUsers: vi.fn().mockResolvedValue([
    { id: "owner-1", name: "오너 (법무팀)" },
    { id: "cc-1", name: "참조자 (영업팀)" },
  ]),
}));

const renderForm = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CommentForm onSubmit={onSubmit} />
    </QueryClientProvider>,
  );
  return { onSubmit };
};

describe("CommentForm 멘션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("멘션 검색 → 후보 선택 → chip 노출 → 제출 시 mentions[] 를 전달한다", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    // 본문 입력.
    await user.type(
      screen.getByPlaceholderText("검토 의견을 남겨주세요."),
      "멘션 포함 의견",
    );

    // 멘션 검색.
    const search = screen.getByPlaceholderText("멘션 추가 — 이름·부서로 검색");
    await user.type(search, "오너");

    // 후보 드롭다운에서 선택.
    const option = await screen.findByText("오너 (법무팀)");
    await user.click(option);

    // chip 으로 노출(검색어 초기화 후).
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /오너 \(법무팀\) 멘션 제거/ }),
      ).toBeInTheDocument(),
    );

    // 제출 → onSubmit(body, [userId]).
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("멘션 포함 의견", ["owner-1"]),
    );
  });

  it("멘션 없이 제출하면 빈 mentions[] 를 전달한다", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await user.type(
      screen.getByPlaceholderText("검토 의견을 남겨주세요."),
      "멘션 없는 의견",
    );
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("멘션 없는 의견", []),
    );
  });
});
