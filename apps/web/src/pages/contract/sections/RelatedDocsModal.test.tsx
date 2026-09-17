import type { ListContractsResponse } from "@lawai/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { ContractSummary } from "@lawai/contracts";
import { RelatedDocsModal } from "./RelatedDocsModal";
import { listContracts } from "../../../api/contracts";

vi.mock("../../../api/contracts");

const summary = (over: Partial<ContractSummary>): ContractSummary => ({
  id: "c-1",
  code: "C20260512-0101",
  title: "SW 공급계약",
  status: "signed",
  securityLevel: "normal",
  party: null,
  categoryLabel: null,
  counterpartyName: "삼성전자(주)",
  requesterId: null,
  requesterName: null,
  ownerId: null,
  ownerName: null,
  dueDate: null,
  periodEnd: null,
  signedAt: "2026-05-12T00:00:00.000Z",
  createdById: "u1",
  updatedAt: "2026-06-01T09:00:00.000Z",
  ...over,
});

function renderModal(onConfirm = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RelatedDocsModal selected={[]} onClose={vi.fn()} onConfirm={onConfirm} />
    </QueryClientProvider>,
  );
  return { onConfirm };
}

describe("RelatedDocsModal", () => {
  beforeEach(() => {
    vi.mocked(listContracts).mockReset();
    vi.mocked(listContracts).mockResolvedValue({
      items: [summary({}), summary({ id: "c-2", code: "C20260428-0077", title: "개인정보 위탁처리 계약서", status: "legalReview" })],
      total: 2,
      page: 1,
      pageSize: 30,
      counts: {} as ListContractsResponse["counts"],
    });
  });

  it("실제 계약을 불러와 보여주고, 아직 없는 분류는 준비 중으로 표시한다", async () => {
    renderModal();
    expect(screen.getByText("관련문서 찾아보기")).toBeInTheDocument();
    expect(await screen.findByText("SW 공급계약")).toBeInTheDocument();
    expect(screen.getByText("C20260512-0101 · 체결 완료 · 삼성전자(주)")).toBeInTheDocument();
    expect(listContracts).toHaveBeenCalledWith({ q: undefined, pageSize: 30 });
    expect(screen.getAllByText("준비 중")).toHaveLength(3);
  });

  it("키워드로 계약을 다시 찾는다", async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByText("SW 공급계약");
    await user.type(screen.getByPlaceholderText("계약명 · 관리번호 · 상대계약자로 검색"), "위탁");
    await vi.waitFor(() => expect(listContracts).toHaveBeenLastCalledWith({ q: "위탁", pageSize: 30 }));
  });

  it("문서를 선택하고 '선택 완료'하면 onConfirm으로 전달한다", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();
    await user.click(await screen.findByText("SW 공급계약"));
    await user.click(screen.getByRole("button", { name: "선택 완료" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toEqual([
      expect.objectContaining({ id: "c-1", name: "SW 공급계약", category: "contract" }),
    ]);
  });
});
