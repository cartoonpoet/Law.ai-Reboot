import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "./LoginPage";
import * as authApi from "../../api/auth";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("이메일/비밀번호 입력과 로그인 버튼을 렌더한다", () => {
    renderPage();
    expect(screen.getByPlaceholderText("email@humaxit.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("비밀번호 입력")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  it("제출하면 login API를 호출하고 토큰을 저장한다", async () => {
    const loginSpy = vi.spyOn(authApi, "login").mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "A", role: "general", departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    renderPage();
    await userEvent.clear(screen.getByPlaceholderText("email@humaxit.com"));
    await userEvent.type(screen.getByPlaceholderText("email@humaxit.com"), "a@b.com");
    await userEvent.type(screen.getByPlaceholderText("비밀번호 입력"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "password123",
      });
      expect(localStorage.getItem("accessToken")).toBe("at");
      expect(localStorage.getItem("refreshToken")).toBe("rt");
    });
  });
});
