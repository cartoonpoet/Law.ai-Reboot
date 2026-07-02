import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Company } from "@lawai/contracts";
import { useCompanySearch } from "./useCompanySearch";
import { searchCompanies } from "../../../api/companies";

vi.mock("../../../api/companies", () => ({ searchCompanies: vi.fn() }));
const mockSearch = vi.mocked(searchCompanies);

const company = (id: string, name: string): Company => ({
  id, type: "company", name, bizNo: "000-00-00000",
  ceo: null, phone: null, address: null, addressDetail: null,
  managerName: null, managerPhone: null, managerEmail: null, createdAt: "",
});

describe("useCompanySearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearch.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("입력값을 query에 반영한다", () => {
    const { result } = renderHook(() => useCompanySearch());
    act(() => result.current.search("삼성"));
    expect(result.current.query).toBe("삼성");
  });

  it("디바운스 후 searchCompanies를 1회 호출하고 결과를 반영한다", async () => {
    mockSearch.mockResolvedValue([company("a", "삼성전자(주)")]);
    const { result } = renderHook(() => useCompanySearch());
    act(() => result.current.search("삼"));
    act(() => result.current.search("삼성"));
    expect(mockSearch).not.toHaveBeenCalled(); // 디바운스 전엔 호출 안 됨
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith("삼성");
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].name).toBe("삼성전자(주)");
  });

  it("빈 입력은 결과를 즉시 비우고 API를 호출하지 않는다", async () => {
    mockSearch.mockResolvedValue([company("a", "A")]);
    const { result } = renderHook(() => useCompanySearch());
    act(() => result.current.search("A"));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.results).toHaveLength(1);
    act(() => result.current.search("   "));
    expect(result.current.results).toEqual([]);
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it("API 실패 시 결과를 비운다", async () => {
    mockSearch.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useCompanySearch());
    act(() => result.current.search("X"));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.results).toEqual([]);
  });
});
