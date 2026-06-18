import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import type { Company } from "@lawai/contracts";
import { useCounterparties } from "./useCounterparties";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrapper({ children }: { children: ReactNode }) {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

const company = (id: string, name: string): Company => ({
  id, type: "company", name, bizNo: "000-00-00000",
  ceo: null, phone: null, address: null, addressDetail: null,
  managerName: null, managerPhone: null, managerEmail: null, createdAt: "",
});

describe("useCounterparties", () => {
  it("add는 회사를 추가하고 같은 id는 무시한다", () => {
    const { result } = renderHook(() => useCounterparties(), { wrapper: Wrapper });
    act(() => result.current.add(company("a", "A")));
    act(() => result.current.add(company("a", "A-중복")));
    act(() => result.current.add(company("b", "B")));
    expect(result.current.selected.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("selectByIds는 주어진 id 순서대로 Company로 복원한다", () => {
    const { result } = renderHook(() => useCounterparties(), { wrapper: Wrapper });
    const pool = [company("a", "A"), company("b", "B"), company("d", "D")];
    act(() => result.current.selectByIds(["d", "a"], pool));
    expect(result.current.selected.map((c) => c.id)).toEqual(["d", "a"]);
  });
});
