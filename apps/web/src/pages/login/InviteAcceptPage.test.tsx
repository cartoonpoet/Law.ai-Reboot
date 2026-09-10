import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InviteAcceptPage } from "./InviteAcceptPage";
import { getInviteInfo, acceptInvite } from "../../api/auth";

vi.mock("../../api/auth");

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderPage(initial = "/invite?token=raw123") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/invite" element={<InviteAcceptPage />} />
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("InviteAcceptPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("유효 초대면 회사명·이메일·역할과 가입 폼을 보여준다", async () => {
    vi.mocked(getInviteInfo).mockResolvedValue({
      tenantName: "D물산", email: "j.park@d.com", role: "general",
    });
    renderPage();
    expect(await screen.findByText("D물산에 초대되었습니다")).toBeInTheDocument();
    expect(screen.getByText(/j\.park@d\.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가입하고 시작하기" })).toBeInTheDocument();
  });

  it("토큰이 없거나 무효면 오류 카드를 보여준다", async () => {
    vi.mocked(getInviteInfo).mockRejectedValue(new Error("유효하지 않거나 만료된 초대 링크입니다"));
    renderPage();
    expect(await screen.findByText("초대 링크 오류")).toBeInTheDocument();
  });

  it("신규 가입 성공 시 토큰을 저장하고 루트로 이동한다", async () => {
    const user = userEvent.setup();
    vi.mocked(getInviteInfo).mockResolvedValue({
      tenantName: "D물산", email: "j.park@d.com", role: "general",
    });
    vi.mocked(acceptInvite).mockResolvedValue({
      existingUser: false,
      user: { id: "nu1", email: "j.park@d.com", name: "박준영", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    renderPage();
    await screen.findByText("D물산에 초대되었습니다");

    await user.type(screen.getByPlaceholderText("홍길동"), "박준영");
    const pwInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(pwInputs[0], "password123");
    await user.type(pwInputs[1], "password123");
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));

    expect(await screen.findByTestId("location")).toHaveTextContent("/");
    expect(vi.mocked(acceptInvite)).toHaveBeenCalledWith({
      token: "raw123", name: "박준영", password: "password123",
    });
    expect(localStorage.getItem("accessToken")).toBe("at");
  });

  it("기존 계정이면 소속 추가 안내와 로그인 버튼을 보여준다", async () => {
    const user = userEvent.setup();
    vi.mocked(getInviteInfo).mockResolvedValue({
      tenantName: "D물산", email: "old@d.com", role: "general",
    });
    vi.mocked(acceptInvite).mockResolvedValue({ existingUser: true });
    renderPage();
    await screen.findByText("D물산에 초대되었습니다");

    await user.type(screen.getByPlaceholderText("홍길동"), "무시");
    const pwInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(pwInputs[0], "password123");
    await user.type(pwInputs[1], "password123");
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));

    expect(await screen.findByText(/기존 계정에/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인하러 가기" })).toBeInTheDocument();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
});
