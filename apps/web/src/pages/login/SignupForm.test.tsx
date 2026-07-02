import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SignupForm } from "./SignupForm";
import * as authApi from "../../api/auth";

function renderForm() {
  return render(
    <MemoryRouter>
      <SignupForm />
    </MemoryRouter>,
  );
}

describe("SignupForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("필수 필드를 비우고 제출하면 검증 에러를 보여준다", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "가입 신청" }));
    expect(await screen.findByText("이름을 입력하세요")).toBeInTheDocument();
  });

  it("비밀번호가 일치하지 않으면 에러를 보여준다", async () => {
    renderForm();
    await userEvent.type(screen.getByPlaceholderText("비밀번호"), "abcd1234!");
    await userEvent.type(
      screen.getByPlaceholderText("비밀번호 재입력"),
      "different9!",
    );
    await userEvent.click(screen.getByRole("button", { name: "가입 신청" }));
    expect(
      await screen.findByText("비밀번호가 일치하지 않습니다"),
    ).toBeInTheDocument();
  });

  it("유효 입력 시 signup을 email/name/password로 호출한다", async () => {
    const signupSpy = vi.spyOn(authApi, "signup").mockResolvedValue({
      user: { id: "u1", email: "hong@humaxit.com", name: "홍길동", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    renderForm();
    await userEvent.type(screen.getByPlaceholderText("홍길동"), "홍길동");
    await userEvent.type(screen.getByPlaceholderText("HX-00000"), "HX-12345");
    await userEvent.type(
      screen.getByPlaceholderText("email@humaxit.com"),
      "hong@humaxit.com",
    );
    await userEvent.type(screen.getByPlaceholderText("비밀번호"), "abcd1234!");
    await userEvent.type(screen.getByPlaceholderText("비밀번호 재입력"), "abcd1234!");
    // 부서 선택
    await userEvent.click(screen.getByText("부서 선택"));
    await userEvent.click(screen.getByText("법무팀"));
    // 약관 동의
    await userEvent.click(
      screen.getByLabelText("이용약관 및 개인정보 처리방침에 동의합니다"),
    );
    await userEvent.click(screen.getByRole("button", { name: "가입 신청" }));

    await waitFor(() => {
      expect(signupSpy).toHaveBeenCalledWith({
        email: "hong@humaxit.com",
        name: "홍길동",
        password: "abcd1234!",
      });
      expect(localStorage.getItem("accessToken")).toBe("at");
    });
  });
});
