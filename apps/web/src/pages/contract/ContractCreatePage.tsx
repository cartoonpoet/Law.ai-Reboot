import { useQuery } from "@tanstack/react-query";
import { Panel } from "../../components/ui/Panel";
import { getMe } from "../../api/users";
import { contractRequestDefaults } from "./request-schema";
import { ContractRequestPage } from "./ContractRequestPage";

// 생성 모드: 현재 사용자를 불러와 검토 요청자 기본값으로 채운 뒤 폼 렌더.
export function ContractCreatePage() {
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });

  if (!me) {
    return (
      <Panel pad={18}>
        {isLoading ? "불러오는 중…" : "사용자 정보를 불러올 수 없습니다."}
      </Panel>
    );
  }

  return (
    <ContractRequestPage
      mode="create"
      initialValues={{ ...contractRequestDefaults, requester: me.id }}
    />
  );
}
