import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchUsers } from "../../../api/directory";
import { getDisplayName } from "../utils/mentionMarkup";
import type { MentionPicked } from "../hooks/useMentionSuggestion";
import * as s from "../../../components/ui/MentionEditor.css";

const STALE_MS = 5 * 60 * 1000;

/** suggestion 후보 1건 — DirectoryEntry와 동형({id, name}). */
export interface MentionItem {
  id: string;
  name: string;
}

/** 명령형 suggestion render가 키 입력을 위임하는 핸들. */
export interface MentionListHandle {
  /** 키보드 이벤트 처리. 소비하면 true(에디터 기본 동작 차단). */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface MentionListProps {
  query: string;
  onPick: (picked: MentionPicked) => void;
  /** 부모(명령형 suggestion)가 onKeyDown 핸들을 잡도록 등록한다. */
  registerHandle: (handle: MentionListHandle | null) => void;
}

/**
 * 멘션 후보 드롭다운. query로 디렉터리를 검색(react-query 캐시 공유)하고
 * ↑/↓/Enter/Esc 키 네비를 선언적 상태로 관리한다.
 * useUserSearch와 동일 queryKey를 써서 캐시를 공유한다(검색 자체는 react-query가 선언적으로 수행).
 */
export function MentionList({ query, onPick, registerHandle }: MentionListProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  // 명령형 onKeyDown에서 최신 후보/인덱스를 참조하기 위한 미러 ref(선언 불가 경계).
  const stateRef = useRef<{ items: MentionItem[]; activeIndex: number }>({
    items: [],
    activeIndex: 0,
  });

  const { data } = useQuery({
    queryKey: ["directoryUsers", query.trim()],
    queryFn: () => searchUsers(query.trim()),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
  const items = data ?? [];

  // activeIndex가 후보 범위를 벗어나면 0으로 보정(렌더 중 파생, effect 불필요).
  const safeIndex = activeIndex < items.length ? activeIndex : 0;
  stateRef.current = { items, activeIndex: safeIndex };

  const pickAt = (index: number) => {
    const item = stateRef.current.items[index];
    if (!item) return;
    onPick({ id: item.id, label: getDisplayName(item.name) });
  };

  registerHandle({
    onKeyDown: (event) => {
      const { items: currentItems, activeIndex: current } = stateRef.current;
      if (event.key === "ArrowDown") {
        setActiveIndex(currentItems.length ? (current + 1) % currentItems.length : 0);
        return true;
      }
      if (event.key === "ArrowUp") {
        setActiveIndex(
          currentItems.length ? (current - 1 + currentItems.length) % currentItems.length : 0,
        );
        return true;
      }
      if (event.key === "Enter") {
        pickAt(current);
        return true;
      }
      if (event.key === "Escape") return true;
      return false;
    },
  });

  if (items.length === 0) {
    return <div className={s.dropdown}><div className={s.empty}>검색 결과 없음</div></div>;
  }

  return (
    <div className={s.dropdown}>
      {items.map((item, index) => {
        const displayName = getDisplayName(item.name);
        // 부서 라벨: 순수 이름 뒤 잔여("(영업팀)" 등). 부서 정보 없으면 null.
        const deptLabel =
          item.name === displayName ? null : item.name.slice(displayName.length).trim();
        return (
          <button
            key={item.id}
            type="button"
            className={s.option}
            data-active={index === safeIndex}
            onMouseDown={(event) => {
              event.preventDefault();
              pickAt(index);
            }}
          >
            {displayName}
            {deptLabel ? <span className={s.optionDept}>{deptLabel}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
