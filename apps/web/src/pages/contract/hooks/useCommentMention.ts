import { useState } from "react";
import type { DirectoryEntry } from "../../../api/directory";
import { useUserSearch } from "./useUserSearch";

export interface MentionPick {
  userId: string;
  name: string;
}

/**
 * 코멘트 멘션 선택 상태 + 후보 검색 훅 (SRP — CommentForm 본문에서 분리).
 *
 * 후보는 디렉터리 검색(useUserSearch)으로 노출하고, 비관련자가 섞이면
 * 서버가 400 으로 거부(안전망). 선택된 멘션은 chip 으로 표시·제거 가능하며
 * 화면은 selected/users 에서 선언적으로 파생한다(직접 DOM 조작·useEffect 없음).
 */
export const useCommentMention = () => {
  const { users, search } = useUserSearch();
  const [selected, setSelected] = useState<MentionPick[]>([]);

  // 이미 고른 사용자는 후보에서 제외(렌더 중 파생).
  const selectedIds = new Set(selected.map((m) => m.userId));
  const candidates = users.filter((u) => !selectedIds.has(u.id));

  const addMention = (entry: DirectoryEntry) => {
    if (selectedIds.has(entry.id)) return;
    setSelected((prev) => [...prev, { userId: entry.id, name: entry.name }]);
  };

  const removeMention = (userId: string) => {
    setSelected((prev) => prev.filter((m) => m.userId !== userId));
  };

  const reset = () => setSelected([]);

  return {
    mentions: selected,
    mentionIds: selected.map((m) => m.userId),
    candidates,
    search,
    addMention,
    removeMention,
    reset,
  };
};
