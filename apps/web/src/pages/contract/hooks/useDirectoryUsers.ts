import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "../../../api/directory";
import type { SelectOption } from "../contractOptions";

// 검토 요청자 등 단일 사용자 선택용 옵션(디렉터리 전체, 상한 100).
export const useDirectoryUsers = (): SelectOption[] => {
  const { data } = useQuery({
    queryKey: ["directory", "users"],
    queryFn: () => searchUsers("", 100),
  });
  return (data ?? []).map((u) => ({ value: u.id, label: u.name }));
};
