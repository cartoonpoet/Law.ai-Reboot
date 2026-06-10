import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ContractRequestPage } from "./ContractRequestPage";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ContractRequestPage />
    </MemoryRouter>,
  );
}

// lawkit Dropdown 의 트리거는 placeholder("선택") 텍스트를 가진 button 이고,
// 열리면 옵션이 role="option" button 으로 렌더된다.
// 선택되면 트리거의 텍스트가 선택값으로 바뀌므로, 항상 남아있는 첫 "선택" 트리거를 누른다.
async function selectDropdownOption(user: ReturnType<typeof userEvent.setup>, optionLabel: string) {
  const triggers = screen.getAllByRole("button", { name: "선택" });
  await user.click(triggers[0]);
  await user.click(await screen.findByRole("option", { name: optionLabel }));
}

describe("ContractRequestPage", () => {
  beforeEach(() => navigateMock.mockReset());

  it("계약서 검토 요청 폼을 렌더한다", () => {
    renderPage();
    expect(screen.getByText("계약서 검토 요청")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("계약명을 입력하세요")).toBeInTheDocument();
  });

  it("필수값 없이 제출하면 검증 에러를 보여주고 이동하지 않는다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /검토 요청/ }));
    expect(await screen.findByText("계약명을 입력하세요")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("필수값을 채우고 제출하면 상세로 이동한다", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText("계약명을 입력하세요"), "테스트 공급계약");
    await user.type(screen.getByPlaceholderText("YYYY-MM-DD ~ YYYY-MM-DD"), "2026-07-01 ~ 2027-06-30");
    await user.type(screen.getByPlaceholderText("계약을 체결하는 배경과 목적을 입력하세요"), "테스트 목적");
    // 계약 당사자·대분류 Dropdown 선택
    await selectDropdownOption(user, "본사계약");
    await selectDropdownOption(user, "개발/공급");

    await user.click(screen.getByRole("button", { name: /검토 요청/ }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/contract/C20250710-0004"));
  });
});
