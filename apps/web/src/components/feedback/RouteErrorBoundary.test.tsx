import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ApiError } from "../../api/apiError";
import { createQueryClient } from "../../lib/queryClient";
import { getToasts, resetToasts } from "../../lib/toast/toastStore";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const renderWithBoundary = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <RouteErrorBoundary>{ui}</RouteErrorBoundary>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("RouteErrorBoundary", () => {
  beforeEach(() => resetToasts());

  it("렌더 크래시는 본문 자리에 오류 페이지를 보여준다(내부 메시지는 숨김)", () => {
    const Crash = () => {
      throw new TypeError("Cannot read properties of undefined");
    };
    renderWithBoundary(<Crash />);
    expect(screen.getByText("일시적인 오류가 발생했어요")).toBeInTheDocument();
    expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("page 모드 쿼리가 404 로 실패하면 토스트 없이 찾을 수 없음 페이지", async () => {
    const Detail = () => {
      useQuery({
        queryKey: ["contract", "missing"],
        queryFn: () => Promise.reject(new ApiError(404, "계약을 찾을 수 없습니다")),
        meta: { errorMode: "page" },
      });
      return <p>상세</p>;
    };
    renderWithBoundary(<Detail />);
    expect(await screen.findByText("페이지를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByText("계약을 찾을 수 없습니다")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
    expect(getToasts()).toEqual([]);
  });

  it("다시 시도하면 실패한 쿼리를 리셋해 재조회하고, 성공하면 본문으로 돌아온다", async () => {
    let calls = 0;
    const Inbox = () => {
      const { data } = useQuery({
        queryKey: ["approvalInbox"],
        queryFn: () => {
          calls += 1;
          return calls <= 2 ? Promise.reject(new ApiError(503, "점검 중")) : Promise.resolve("ok");
        },
        meta: { errorMode: "page" },
        retryDelay: 0,
      });
      return <p>대기함 {data}</p>;
    };
    renderWithBoundary(<Inbox />);
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(screen.getByText("대기함 ok")).toBeInTheDocument());
  });
});
