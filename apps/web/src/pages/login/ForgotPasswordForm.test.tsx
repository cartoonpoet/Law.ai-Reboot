import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import * as authApi from "../../api/auth";

function renderForm() {
  return render(
    <MemoryRouter>
      <ForgotPasswordForm />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("이메일 입력과 전송 버튼을 렌더한다", () => {
    renderForm();
    expect(screen.getByPlaceholderText("email@humaxit.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    ).toBeInTheDocument();
  });

  it("전송하면 reset-request API를 호출하고 성공 안내가 노출된다", async () => {
    const spy = vi
      .spyOn(authApi, "requestPasswordReset")
      .mockResolvedValue({ ok: true });
    renderForm();
    await userEvent.type(
      screen.getByPlaceholderText("email@humaxit.com"),
      "a@humaxit.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    );
    expect(await screen.findByText("메일을 전송했습니다")).toBeInTheDocument();
    expect(screen.getByText(/a@humaxit\.com/)).toBeInTheDocument();
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ email: "a@humaxit.com" }),
    );
  });

  it("API가 실패해도 동일한 안내를 보여준다 (이메일 열거 방지)", async () => {
    vi.spyOn(authApi, "requestPasswordReset").mockRejectedValue(
      new Error("boom"),
    );
    renderForm();
    await userEvent.type(
      screen.getByPlaceholderText("email@humaxit.com"),
      "a@humaxit.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    );
    expect(await screen.findByText("메일을 전송했습니다")).toBeInTheDocument();
  });

  it("다시 전송을 누르면 입력 화면으로 돌아간다", async () => {
    vi.spyOn(authApi, "requestPasswordReset").mockResolvedValue({ ok: true });
    renderForm();
    await userEvent.type(
      screen.getByPlaceholderText("email@humaxit.com"),
      "a@humaxit.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    );
    await screen.findByText("메일을 전송했습니다");
    await userEvent.click(screen.getByRole("button", { name: "다시 전송" }));
    expect(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    ).toBeInTheDocument();
  });
});
