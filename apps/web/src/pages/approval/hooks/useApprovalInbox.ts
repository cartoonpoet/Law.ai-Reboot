import { useQuery } from "@tanstack/react-query";
import { getApprovalInbox } from "../../../api/approvals";

export const APPROVAL_INBOX_QUERY_KEY = ["approvalInbox"] as const;

// 결재 대기함 조회 — pending(내 차례)/processed(처리한 결재) 원본을 그대로 노출.
// 행 매핑(toInboxRow)은 렌더 중 파생한다.
export const useApprovalInbox = () => {
  const query = useQuery({
    queryKey: APPROVAL_INBOX_QUERY_KEY,
    queryFn: getApprovalInbox,
    // 대기함 화면의 주 데이터 — 실패하면 본문을 오류 페이지로.
    meta: { errorMode: "page" },
  });
  return {
    pending: query.data?.pending ?? [],
    processed: query.data?.processed ?? [],
    isLoading: query.isLoading,
  };
};
