import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ContractListPage } from "./ContractListPage";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ContractListPage />
    </MemoryRouter>,
  );
}

describe("ContractListPage", () => {
  beforeEach(() => navigateMock.mockReset());

  it("계약서 검토 조회 헤더와 계약 행을 렌더한다", () => {
    renderPage();
    expect(screen.getByText("계약서 검토 조회")).toBeInTheDocument();
    expect(screen.getByText("한라산 EV 충전기 공급계약")).toBeInTheDocument();
  });

  it("계약 행을 클릭하면 상세로 이동한다", async () => {
    renderPage();
    const cell = screen.getByText("한라산 EV 충전기 공급계약");
    const row = cell.closest("tr");
    if (row) {
      await userEvent.click(row);
    } else {
      await userEvent.click(cell);
    }
    expect(navigateMock).toHaveBeenCalledWith("/contract/C20250710-0004");
  });

  it("검토 요청 버튼은 요청 화면으로 이동한다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /검토 요청/ }));
    expect(navigateMock).toHaveBeenCalledWith("/contract/request");
  });
});
