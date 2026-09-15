import { Button, Icon, Input } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { useOriginContractSearch } from "../hooks/useOriginContractSearch";
import { getStatusLabel } from "../contractStatus";
import * as css from "./originContractPicker.css";

type OriginContractValue = ContractRequestForm["originContract"];

interface OriginContractPickerProps {
  value: OriginContractValue;
  onChange: (value: OriginContractValue) => void;
}

/** 원 계약 고르기 — 고른 계약이 있으면 요약 + "다른 계약 고르기", 없으면 체결된 계약 검색. */
export const OriginContractPicker = ({ value, onChange }: OriginContractPickerProps) => {
  const { results, isFetching, search } = useOriginContractSearch();

  if (value) {
    return (
      <div className={css.selected}>
        <div className={css.selectedMain}>
          <span className={css.title}>{value.title}</span>
          <span className={css.meta}>{value.code}</span>
        </div>
        <Button type="button" size="small" variant="outline" color="secondary" onClick={() => onChange(null)}>
          다른 계약 고르기
        </Button>
      </div>
    );
  }

  return (
    <div className={css.wrap}>
      <Input
        aria-label="원 계약 검색"
        placeholder="계약명·관리번호로 체결된 계약 찾기"
        rightIcon={<Icon name="search" size="sm" />}
        onChange={(e) => search(e.target.value)}
      />
      {isFetching && <p className={css.hint}>찾는 중…</p>}
      {results.length > 0 && (
        <ul className={css.list}>
          {results.map((contract) => (
            <li key={contract.id}>
              <button
                type="button"
                className={css.item}
                onClick={() => onChange({ id: contract.id, code: contract.code, title: contract.title })}
              >
                <span className={css.title}>{contract.title}</span>
                <span className={css.meta}>
                  {contract.code} · {getStatusLabel(contract.status)}
                  {contract.counterpartyName ? ` · ${contract.counterpartyName}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
