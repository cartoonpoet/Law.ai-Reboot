import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContractSummary } from "@lawai/contracts";
import { ExpiringContractsPage } from "./ExpiringContractsPage";
import { useExpiringContracts } from "./useExpiringContracts";
import { useRenewalTerms } from "./useRenewalTerms";
import { useExpireContract } from "./useExpireContract";

vi.mock("./useExpiringContracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useExpiringContracts")>()),
  useExpiringContracts: vi.fn(),
}));
vi.mock("./useRenewalTerms");
vi.mock("./useExpireContract");
vi.mock("../sections/TerminateContractModal", () => ({
  TerminateContractModal: ({ onRequestReview }: { onRequestReview: () => void }) => (
    <div role="dialog" aria-label="중도 해지 모달 스텁">
      <button onClick={onRequestReview}>해지 합의서 검토 요청</button>
    </div>
  ),
}));

const DAY_MS = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const summary = (over: Partial<ContractSummary>): ContractSummary => ({
  id: "c1",
  code: "C20250918-0233",
  title: "클라우드 서비스 이용계약",
  status: "fulfilling",
  securityLevel: "normal",
  party: null,
  categoryLabel: null,
  counterpartyName: "네오클라우드",
  requesterId: null,
  requesterName: null,
  ownerId: "o1",
  ownerName: "김법무",
  dueDate: null,
  periodEnd: inDays(3),
  signedAt: "2025-09-10T00:00:00.000Z",
  createdById: "u1",
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

const read = vi.fn();
const expire = vi.fn();
const setTab = vi.fn();

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/contract/expiring"]}>
      <Routes>
        <Route path="/contract/expiring" element={<ExpiringContractsPage />} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ExpiringContractsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExpiringContracts).mockReturnValue({
      tab: "d7",
      setTab,
      contracts: [summary({}), summary({ id: "c2", code: "C20240921-0107", title: "물류 위탁 계약", status: "signed", periodEnd: inDays(6) })],
      total: 2,
      isLoading: false,
      counts: { d7: 2, d30: 5, d90: 14, expired: 3 },
    });
    vi.mocked(useRenewalTerms).mockReturnValue({
      states: {
        c1: {
          status: "done",
          terms: { autoRenewal: false, renewalPeriod: null, noticeDays: null, noticeDeadline: null, clause: null, summary: "자동갱신 없음" },
        },
        c2: { status: "none" },
      },
      read,
      sendingId: null,
    });
    vi.mocked(useExpireContract).mockReturnValue({ expire, isPending: false });
  });

  it("기간 탭에 건수를 붙이고, 누르면 그 기간으로 바꾼다", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole("tab", { name: "7일 안 2" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "지난 만료 3" }));
    expect(setTab).toHaveBeenCalledWith("expired");
  });

  it("만료가 가까운 계약을 D-day·AI 판단과 함께 보여주고, 아직 안 읽은 계약은 AI로 읽기를 누를 수 있다", async () => {
    const user = userEvent.setup();
    renderPage();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("D-3")).toBeInTheDocument();
    expect(within(rows[0]).getByText("자동갱신 조항 없음 — 그대로 두면 만료돼요")).toBeInTheDocument();

    await user.click(within(rows[1]).getByRole("button", { name: "AI로 읽기" }));
    expect(read).toHaveBeenCalledWith("c2");
  });

  it("만료로 종료는 계약 이행 중인 계약에만 있고, 확인하면 종료한다", async () => {
    const user = userEvent.setup();
    renderPage();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[1]).queryByRole("button", { name: "만료로 종료" })).not.toBeInTheDocument();

    await user.click(within(rows[0]).getByRole("button", { name: "만료로 종료" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "만료로 종료" }));
    expect(expire).toHaveBeenCalledWith("c1", expect.any(Function));
  });

  it("갱신 요청은 원 계약을 채운 갱신 요청 폼으로, 해지 창의 검토 요청은 해지 요청 폼으로 보낸다", async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await user.click(within(screen.getAllByRole("row")[1]).getByRole("button", { name: "갱신 요청" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/contract/request?origin=c1&stage=renew");
    unmount();

    renderPage();
    await user.click(within(screen.getAllByRole("row")[2]).getByRole("button", { name: "중도 해지" }));
    await user.click(screen.getByRole("button", { name: "해지 합의서 검토 요청" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/contract/request?origin=c2&stage=terminate");
  });

  it("해당 기간에 계약이 없으면 안내를 보여준다", () => {
    vi.mocked(useExpiringContracts).mockReturnValue({
      tab: "d7",
      setTab,
      contracts: [],
      total: 0,
      isLoading: false,
      counts: { d7: 0, d30: 0, d90: 0, expired: 0 },
    });
    renderPage();
    expect(screen.getByText("7일 안에 만료되는 계약이 없어요.")).toBeInTheDocument();
  });
});
