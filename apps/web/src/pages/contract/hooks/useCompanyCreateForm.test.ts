import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCompanyCreateForm, companyCreateSchema } from "./useCompanyCreateForm";
import { createCompany, searchCompanies } from "../../../api/companies";
import { openAddressSearch } from "../daumPostcode";

vi.mock("../../../api/companies", () => ({ createCompany: vi.fn(), searchCompanies: vi.fn() }));
vi.mock("../daumPostcode", () => ({ openAddressSearch: vi.fn() }));
const mockCreate = vi.mocked(createCompany);
const mockSearch = vi.mocked(searchCompanies);
const mockOpenAddress = vi.mocked(openAddressSearch);

const base = {
  type: "company" as const, name: "삼성(주)", ceo: "이재용",
  phone: "", address: "", addressDetail: "", managerName: "", managerPhone: "", managerEmail: "",
};

describe("companyCreateSchema", () => {
  it("회사(법인)는 사업자번호가 없으면 실패한다", () => {
    const r = companyCreateSchema.safeParse({ ...base, bizNo: "" });
    expect(r.success).toBe(false);
  });

  it("개인은 사업자번호 없이도 통과한다", () => {
    const r = companyCreateSchema.safeParse({ ...base, type: "individual", bizNo: "" });
    expect(r.success).toBe(true);
  });

  it("회사명/대표자명이 비면 실패한다", () => {
    expect(companyCreateSchema.safeParse({ ...base, bizNo: "1", name: "" }).success).toBe(false);
    expect(companyCreateSchema.safeParse({ ...base, bizNo: "1", ceo: "" }).success).toBe(false);
  });

  it("잘못된 담당자 이메일은 실패한다", () => {
    expect(companyCreateSchema.safeParse({ ...base, bizNo: "1", managerEmail: "bad" }).success).toBe(false);
  });
});

describe("useCompanyCreateForm", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockSearch.mockReset();
    mockOpenAddress.mockReset();
  });

  const setup = (overrides = {}) => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCompanyCreateForm({ initialName: "신규(주)", onCreated, onClose, ...overrides }),
    );
    return { result, onCreated, onClose };
  };

  it("bizNoCheck: 번호 미입력 시 안내 메시지를 낸다", async () => {
    const { result } = setup();
    await act(async () => result.current.bizNoCheck.run());
    expect(result.current.bizNoCheck.result.status).toBe("idle");
    expect(result.current.bizNoCheck.result.message).toMatch(/입력/);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("findAddress: 검색 콜백 결과를 주소에 반영한다", () => {
    mockOpenAddress.mockImplementation((cb) => {
      cb("서울시 강남구 테헤란로");
      return Promise.resolve();
    });
    const { result } = setup();
    act(() => result.current.findAddress());
    expect(mockOpenAddress).toHaveBeenCalledTimes(1);
  });

  it("clearBizNoCheck: 결과를 idle로 초기화한다", async () => {
    const { result } = setup();
    await act(async () => result.current.bizNoCheck.run()); // idle 메시지 세팅
    act(() => result.current.bizNoCheck.clear());
    expect(result.current.bizNoCheck.result).toEqual({ status: "idle", message: "" });
  });
});
