import type { ListContractsResponse } from "@lawai/contracts";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useContractsList } from "./useContractsList";
import { listContracts } from "../../../api/contracts";

vi.mock("../../../api/contracts");
const mockListContracts = vi.mocked(listContracts);

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useContractsList", () => {
  beforeEach(() => {
    mockListContracts.mockReset();
    mockListContracts.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, counts: {} as ListContractsResponse["counts"] });
  });

  it("changeGroup 은 세부 상태(status)를 초기화한다", () => {
    const { result } = renderHook(() => useContractsList(), { wrapper });

    act(() => result.current.changeStatus("legalReview"));
    expect(result.current.status).toBe("legalReview");

    act(() => result.current.changeGroup("sign"));
    expect(result.current.group).toBe("sign");
    expect(result.current.status).toBe("");
  });

  it("세부 상태가 선택되면 listContracts 는 status 만 보내고 statuses 는 생략한다", async () => {
    const { result } = renderHook(() => useContractsList(), { wrapper });

    act(() => result.current.changeGroup("sign"));
    act(() => result.current.changeStatus("signed"));

    await waitFor(() => {
      const last = mockListContracts.mock.calls.at(-1)?.[0];
      expect(last?.status).toBe("signed");
      expect(last?.statuses).toBeUndefined();
    });
  });

  it("세부 상태 없이 그룹만 선택하면 listContracts 는 statuses(그룹 상태 join)를 보낸다", async () => {
    const { result } = renderHook(() => useContractsList(), { wrapper });

    act(() => result.current.changeGroup("sign"));

    await waitFor(() => {
      const last = mockListContracts.mock.calls.at(-1)?.[0];
      expect(last?.status).toBeUndefined();
      expect(last?.statuses).toBe("signing,signed");
    });
  });

  it("status 와 expiry 를 함께 선택하면 listContracts 에 둘 다 전달된다(교집합은 서버 책임)", async () => {
    const { result } = renderHook(() => useContractsList(), { wrapper });

    act(() => result.current.changeStatus("legalReview"));
    act(() => result.current.changeExpiry("expired"));

    await waitFor(() => {
      const last = mockListContracts.mock.calls.at(-1)?.[0];
      expect(last?.status).toBe("legalReview");
      expect(last?.expiry).toBe("expired");
    });
  });

  it("모든 필터 변경 핸들러는 페이지를 1로 되돌린다", () => {
    const { result } = renderHook(() => useContractsList(), { wrapper });

    act(() => result.current.setPage(5));
    act(() => result.current.changeQ("검색어"));
    expect(result.current.page).toBe(1);

    act(() => result.current.setPage(5));
    act(() => result.current.changeStatus("legalReview"));
    expect(result.current.page).toBe(1);

    act(() => result.current.setPage(5));
    act(() => result.current.changeGroup("sign"));
    expect(result.current.page).toBe(1);

    act(() => result.current.setPage(5));
    act(() => result.current.changeExpiry("d90"));
    expect(result.current.page).toBe(1);

    act(() => result.current.setPage(5));
    act(() => result.current.changeParty("본사계약"));
    expect(result.current.page).toBe(1);

    act(() => result.current.setPage(5));
    act(() => result.current.changeCategoryId("cat-1"));
    expect(result.current.page).toBe(1);

    act(() => result.current.setPage(5));
    act(() => result.current.changeMine(true));
    expect(result.current.page).toBe(1);
  });
});
