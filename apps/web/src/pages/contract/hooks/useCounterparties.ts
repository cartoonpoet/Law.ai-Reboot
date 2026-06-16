import { useFormContext, useWatch } from "react-hook-form";
import type { Company } from "@lawai/contracts";
import type { ContractRequestForm } from "../request-schema";

/**
 * 계약 폼의 상대 계약자(counterparties) 선택 상태를 관리한다.
 * RHF 폼 값과 바인딩되며, 추가/AutoComplete 선택 변경을 처리한다.
 */
export const useCounterparties = () => {
  const { control, setValue } = useFormContext<ContractRequestForm>();
  const selected = (useWatch({ control, name: "counterparties" }) ?? []) as Company[];

  const replace = (next: Company[]) =>
    setValue("counterparties", next, { shouldValidate: true });

  const add = (company: Company) => {
    if (selected.some((c) => c.id === company.id)) return;
    replace([...selected, company]);
  };

  // AutoComplete onChange가 준 id 목록을 Company[]로 복원(현재 선택 → 검색결과 순으로 조회)
  const selectByIds = (ids: string[], pool: Company[]) =>
    replace(
      ids
        .map((id) => selected.find((c) => c.id === id) ?? pool.find((c) => c.id === id))
        .filter((company): company is Company => Boolean(company)),
    );

  return { selected, add, selectByIds };
};
