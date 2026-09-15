import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicStats } from "../../api/publicStats";
import { ReviewedContractStat } from "./ReviewedContractStat";

vi.mock("../../api/publicStats");

const renderStat = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReviewedContractStat />
    </QueryClientProvider>,
  );

describe("ReviewedContractStat (로그인 화면 검토된 계약 수)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("서버의 실제 검토된 계약 수까지 숫자를 채워 보여준다", async () => {
    vi.mocked(getPublicStats).mockResolvedValue({ reviewedContractCount: 37 });
    renderStat();
    expect(await screen.findByLabelText("지금까지 검토된 계약 37건")).toBeInTheDocument();
    expect(await screen.findByText("37")).toBeInTheDocument();
    expect(screen.getByText("실시간")).toBeInTheDocument();
  });

  it("불러오지 못하면 가짜 숫자 대신 줄을 숨긴다", async () => {
    vi.mocked(getPublicStats).mockRejectedValue(new Error("network"));
    const { container } = renderStat();
    await vi.waitFor(() => expect(getPublicStats).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/검토된 계약/)).not.toBeInTheDocument();
  });
});
