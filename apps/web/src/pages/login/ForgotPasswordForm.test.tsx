import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

function renderForm() {
  return render(
    <MemoryRouter>
      <ForgotPasswordForm />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordForm", () => {
  it("이메일 입력과 전송 버튼을 렌더한다", () => {
    renderForm();
    expect(screen.getByPlaceholderText("email@humaxit.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    ).toBeInTheDocument();
  });

  it("전송하면 성공 안내가 노출된다 (stub, 네트워크 호출 없음)", async () => {
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
  });

  it("다시 전송을 누르면 입력 화면으로 돌아간다", async () => {
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
