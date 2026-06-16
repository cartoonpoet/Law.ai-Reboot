import type { Company } from "@lawai/contracts";

/** 검색 드롭다운/배지에 쓰는 회사 표시 라벨. TEMP- 사업자번호는 "임시번호"로 표기. */
export const getCompanyLabel = (company: Company): string =>
  company.bizNo.startsWith("TEMP-")
    ? `${company.name} · 임시번호 · ${company.ceo ?? "-"}`
    : `${company.name} · ${company.bizNo} · ${company.ceo ?? "-"}`;

/**
 * AutoComplete options 목록을 만든다.
 * 선택된 회사 ∪ 검색결과 — 선택값이 항상 옵션에 있어야 badge 라벨이 그려진다
 * (신규 등록 직후/다른 검색어 입력 후에도 기존 선택이 id로 깨지지 않게).
 */
export const toCompanyOptions = (selected: Company[], results: Company[]) =>
  [...selected, ...results.filter((r) => !selected.some((c) => c.id === r.id))].map(
    (company) => ({ value: company.id, label: getCompanyLabel(company) }),
  );
