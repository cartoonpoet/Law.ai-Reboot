import { useState } from "react";
import type { ContractSummary } from "@lawai/contracts";
import { listContracts } from "../../api/contracts";
import { useSearchQuery } from "../../pages/contract/hooks/useSearchQuery";
import { NAV_ITEMS } from "../layout/navSections";

const CONTRACT_LIMIT = 5;
// 검색어가 없을 때 바로 가기로 보여줄 메뉴 수.
const QUICK_MENU_LIMIT = 5;

export interface ContractPaletteItem {
  kind: "contract";
  key: string;
  title: string;
  meta: string;
  code: string;
  path: string;
}

export interface MenuPaletteItem {
  kind: "menu";
  key: string;
  title: string;
  icon: string;
  path: string;
}

export interface AiPaletteItem {
  kind: "ai";
  key: "ai";
  prompt: string;
}

export type PaletteItemTypes = ContractPaletteItem | MenuPaletteItem | AiPaletteItem;

const fetchContracts = (query: string) =>
  listContracts({ q: query, pageSize: CONTRACT_LIMIT }).then((res) => res.items);

const toContractItem = (contract: ContractSummary): ContractPaletteItem => ({
  kind: "contract",
  key: `contract-${contract.id}`,
  title: contract.title,
  meta: [contract.counterpartyName ?? "상대방 없음", contract.ownerName ? `담당 ${contract.ownerName}` : "미배정"].join(" · "),
  code: contract.code,
  path: `/contract/${contract.id}`,
});

/**
 * 통합검색 결과 — 계약(서버 검색, 입력 멈춤 후) · 메뉴로 이동 · AI 비서에게 물어보기(항상 맨 끝).
 * 선택 위치는 결과 목록 전체(계약 → 메뉴 → AI)에서 하나의 순번으로 움직인다.
 */
export const useCommandPaletteResults = () => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { results, isFetching, search } = useSearchQuery("command-palette-contracts", fetchContracts);

  const keyword = query.trim();
  const contracts = keyword ? results.slice(0, CONTRACT_LIMIT).map(toContractItem) : [];
  const matchedMenus = keyword
    ? NAV_ITEMS.filter((item) => item.label.includes(keyword))
    : NAV_ITEMS.slice(0, QUICK_MENU_LIMIT);
  const menus = matchedMenus.map(
    (item): MenuPaletteItem => ({ kind: "menu", key: `menu-${item.id}`, title: item.label, icon: item.icon, path: item.path }),
  );
  const aiItem: AiPaletteItem = { kind: "ai", key: "ai", prompt: keyword };
  const items: PaletteItemTypes[] = [...contracts, ...menus, aiItem];
  const selectedIndex = Math.min(activeIndex, items.length - 1);

  const changeQuery = (text: string) => {
    setQuery(text);
    setActiveIndex(0);
    search(text);
  };

  return {
    query,
    keyword,
    contracts,
    menus,
    aiItem,
    items,
    selectedIndex,
    selectedItem: items[selectedIndex],
    isSearching: Boolean(keyword) && isFetching,
    changeQuery,
    select: setActiveIndex,
    moveNext: () => setActiveIndex((selectedIndex + 1) % items.length),
    movePrev: () => setActiveIndex((selectedIndex - 1 + items.length) % items.length),
  };
};
