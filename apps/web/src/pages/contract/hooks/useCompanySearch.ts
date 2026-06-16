import { useRef, useState } from "react";
import type { Company } from "@lawai/contracts";
import { searchCompanies } from "../../../api/companies";

const DEBOUNCE_MS = 300;

/**
 * 회사 검색(상대 계약자용). 입력 멈춤 후 디바운스로 API를 1회 호출해
 * 키 입력마다 호출/응답 경쟁(out-of-order)을 막는다.
 */
export const useCompanySearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        setResults(await searchCompanies(text));
      } catch {
        setResults([]);
      }
    }, DEBOUNCE_MS);
  };

  return { query, results, search };
};
