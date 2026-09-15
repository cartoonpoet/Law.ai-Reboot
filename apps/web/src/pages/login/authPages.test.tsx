import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { getPublicStats } from "../../api/publicStats";
import { AuthLayout } from "./AuthLayout";
import { SsoLoginForm } from "./SsoLoginForm";
import { SignupPage } from "./SignupPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("SsoLoginForm", () => {
  it("SSO 안내와 버튼을 렌더한다", () => {
    render(<SsoLoginForm />);
    expect(screen.getByText("휴맥스 SSO 계정")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /휴맥스 SSO로 계속/ })).toBeInTheDocument();
  });
});

vi.mock("../../api/publicStats");

describe("AuthLayout", () => {
  it("좌측 BrandPanel과 우측 Outlet 자식을 함께 렌더하고, 검토된 계약 수는 실제 집계를 보여준다", async () => {
    vi.mocked(getPublicStats).mockResolvedValue({ reviewedContractCount: 12 });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/x"]}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/x" element={<div>자식 폼</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("자식 폼")).toBeInTheDocument();
    expect(screen.getByText(/계약 검토부터 체결까지/)).toBeInTheDocument();
    expect(await screen.findByLabelText("지금까지 검토된 계약 12건")).toBeInTheDocument();
  });
});

describe("SignupPage", () => {
  it("타이틀을 렌더하고 '로그인' 링크로 이동한다", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <SignupPage />
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "회원가입" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});

describe("ForgotPasswordPage", () => {
  it("타이틀을 렌더하고 '로그인으로' 이동한다", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <ForgotPasswordPage />
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "비밀번호 찾기" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /로그인으로/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});

describe("ResetPasswordPage", () => {
  it("token이 있으면 재설정 폼을 렌더한다", () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?token=abc"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("사용할 새 비밀번호를 입력하세요.")).toBeInTheDocument();
  });

  it("token이 없으면 안내 폴백과 이동 버튼을 렌더한다", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPasswordPage />
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("유효하지 않은 접근입니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /비밀번호 찾기로 이동/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/forgot-password");
  });
});
