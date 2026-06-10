import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "./LoginPage";
import * as authApi from "../api/auth";

function renderPage() {
  const qc = new QueryClient();
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
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "로그인" }),
    ).toBeInTheDocument();
  });

  it("제출하면 login API를 호출하고 토큰을 저장한다", async () => {
    const loginSpy = vi.spyOn(authApi, "login").mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "A", createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    renderPage();
    await userEvent.type(screen.getByLabelText("이메일"), "a@b.com");
    await userEvent.type(screen.getByLabelText("비밀번호"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(loginSpy).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123",
    });
    expect(localStorage.getItem("accessToken")).toBe("at");
  });
});
