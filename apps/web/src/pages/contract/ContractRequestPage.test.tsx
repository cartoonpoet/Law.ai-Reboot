import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { ContractRequestPage } from "./ContractRequestPage";

function setup() {
  return render(<MemoryRouter><ContractRequestPage /></MemoryRouter>);
}

describe("ContractRequestPage", () => {
  it("5개 섹션과 스마트 레일을 렌더한다", () => {
    setup();
    expect(screen.getAllByText("계약 개요").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("상세 내용").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("작성 현황")).toBeInTheDocument();
  });

  it("필수 미입력 상태로 제출하면 에러를 노출한다", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /검토요청 등록/ }));
    expect(await screen.findByText("계약명을 입력하세요")).toBeInTheDocument();
  });
});
