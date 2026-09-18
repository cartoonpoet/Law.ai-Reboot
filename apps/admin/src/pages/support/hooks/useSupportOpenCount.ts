import { useQuery } from "@tanstack/react-query";
import { listAdminSupportThreads } from "../../../api/adminSupport";
import { SUPPORT_INBOX_QUERY_KEY } from "./useSupportInbox";

// 사이드바 문의함 옆 숫자 — 답변 대기 중인 문의 수. 문의함을 열거나 답하면 같은 키로 함께 갱신된다.
export const useSupportOpenCount = () => {
  const query = useQuery({
    queryKey: [...SUPPORT_INBOX_QUERY_KEY, "openCount"],
    queryFn: () => listAdminSupportThreads({ status: "open", limit: 1 }),
    // 사이드바는 모든 화면에 있으므로 조회 실패해도 조용히 넘어간다(메뉴는 그대로 보인다).
    meta: { errorMode: "silent" },
  });
  return { openCount: query.data?.openCount ?? null };
};
