import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { OtpLoginForm } from "./OtpLoginForm";
import * as authApi from "../../api/auth";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderForm() {
  return render(
    <MemoryRouter>
      <OtpLoginForm />
    </MemoryRouter>,
  );
}

describe("OtpLoginForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigateMock.mockReset();
    localStorage.clear();
  });

  it("휴대폰 번호 입력과 인증번호 전송 버튼을 렌더한다", () => {
    renderForm();
    expect(screen.getByPlaceholderText("010-0000-0000")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "인증번호 전송" }),
    ).toBeInTheDocument();
  });

  it("인증번호 전송을 누르면 requestOtp를 호출하고 코드 입력이 활성화된다", async () => {
    const reqSpy = vi
      .spyOn(authApi, "requestOtp")
      .mockResolvedValue({ sent: true });
    renderForm();
    await userEvent.type(
      screen.getByPlaceholderText("010-0000-0000"),
      "01012345678",
    );
    await userEvent.click(screen.getByRole("button", { name: "인증번호 전송" }));
    expect(reqSpy).toHaveBeenCalledWith({ phone: "01012345678" });
    await waitFor(() =>
      expect(screen.getByPlaceholderText("6자리 인증번호")).toBeEnabled(),
    );
  });

  it("인증번호 입력 후 제출하면 verifyOtp를 호출하고 토큰을 저장한다", async () => {
    vi.spyOn(authApi, "requestOtp").mockResolvedValue({ sent: true });
    const verifySpy = vi.spyOn(authApi, "verifyOtp").mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "A", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    renderForm();
    await userEvent.type(
      screen.getByPlaceholderText("010-0000-0000"),
      "01012345678",
    );
    await userEvent.click(screen.getByRole("button", { name: "인증번호 전송" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("6자리 인증번호")).toBeEnabled(),
    );
    await userEvent.type(
      screen.getByPlaceholderText("6자리 인증번호"),
      "123456",
    );
    await userEvent.click(screen.getByRole("button", { name: "인증 후 로그인" }));
    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith({
        phone: "01012345678",
        code: "123456",
      });
      expect(localStorage.getItem("accessToken")).toBe("at");
    });
  });
});
