import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ContractSummary } from "@lawai/contracts";
import { ContractListPage } from "./ContractListPage";
import * as api from "../../api/contracts";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("../../api/contracts");

const summary: ContractSummary = {
  id: "uuid-1",
  code: "C20250710-0004",
  title: "한라산 EV 충전기 공급계약",
  status: "legalReview",
  securityLevel: "secure",
  party: "본사계약",
  categoryLabel: "개발/공급 > 용역",
  counterpartyName: "AAA",
  requesterId: "jhson1",
  requesterName: null,
  ownerId: null,
  ownerName: null,
  dueDate: "2026-06-11T00:00:00.000Z",
  signedAt: null,
  createdById: "u1",
  updatedAt: "2026-06-09T00:00:00.000Z",
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ContractListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ContractListPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(api.listContracts).mockResolvedValue({
      items: [summary],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("헤더와 목록 API 계약 행을 렌더한다", async () => {
    renderPage();
    expect(screen.getByText("계약 조회")).toBeInTheDocument();
    expect(
      await screen.findByText("한라산 EV 충전기 공급계약"),
    ).toBeInTheDocument();
    expect(screen.getByText("C20250710-0004")).toBeInTheDocument();
  });

  it("계약 행을 클릭하면 상세(uuid)로 이동한다", async () => {
    renderPage();
    const cell = await screen.findByText("한라산 EV 충전기 공급계약");
    const row = cell.closest("tr");
    await userEvent.click(row ?? cell);
    expect(navigateMock).toHaveBeenCalledWith("/contract/uuid-1");
  });

  it("검토 요청 버튼은 요청 화면으로 이동한다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /검토 요청/ }));
    expect(navigateMock).toHaveBeenCalledWith("/contract/request");
  });
});
