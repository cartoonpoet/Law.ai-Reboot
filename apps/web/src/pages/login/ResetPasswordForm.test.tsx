import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ResetPasswordForm } from "./ResetPasswordForm";
import * as authApi from "../../api/auth";

function renderForm(token = "raw-token") {
  return render(
    <MemoryRouter>
      <ResetPasswordForm token={token} />
    </MemoryRouter>,
  );
}

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("비밀번호가 일치하지 않으면 에러를 보여준다", async () => {
    renderForm();
    await userEvent.type(screen.getByPlaceholderText("새 비밀번호"), "abcd1234!");
    await userEvent.type(
      screen.getByPlaceholderText("새 비밀번호 재입력"),
      "different9!",
    );
    await userEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
    expect(
      await screen.findByText("비밀번호가 일치하지 않습니다"),
    ).toBeInTheDocument();
  });

  it("유효 입력 시 token과 새 비밀번호로 confirm API를 호출하고 성공 안내를 보여준다", async () => {
    const spy = vi
      .spyOn(authApi, "confirmPasswordReset")
      .mockResolvedValue({ ok: true });
    renderForm("raw-token");
    await userEvent.type(screen.getByPlaceholderText("새 비밀번호"), "abcd1234!");
    await userEvent.type(
      screen.getByPlaceholderText("새 비밀번호 재입력"),
      "abcd1234!",
    );
    await userEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        token: "raw-token",
        newPassword: "abcd1234!",
      }),
    );
    expect(
      await screen.findByText("비밀번호를 변경했습니다"),
    ).toBeInTheDocument();
  });

  it("API가 실패하면 에러 메시지를 보여준다", async () => {
    vi.spyOn(authApi, "confirmPasswordReset").mockRejectedValue(
      new Error("유효하지 않거나 만료된 재설정 링크입니다"),
    );
    renderForm();
    await userEvent.type(screen.getByPlaceholderText("새 비밀번호"), "abcd1234!");
    await userEvent.type(
      screen.getByPlaceholderText("새 비밀번호 재입력"),
      "abcd1234!",
    );
    await userEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
    expect(
      await screen.findByText("유효하지 않거나 만료된 재설정 링크입니다"),
    ).toBeInTheDocument();
  });
});
