import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "../../components/ui/Panel";
import { getContract } from "../../api/contracts";
import { toEditDefaults } from "./toEditDefaults";
import { ContractRequestPage } from "./ContractRequestPage";

// 수정 모드: 기존 계약을 불러와 폼에 prefill 후 ContractRequestPage(edit)로 렌더.
export function ContractEditPage() {
  const { id = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => getContract(id),
    enabled: Boolean(id),
    meta: { errorMode: "page" },
  });

  if (!data) {
    return (
      <Panel pad={18}>
        {isLoading ? "불러오는 중…" : "계약을 찾을 수 없습니다."}
      </Panel>
    );
  }

  return (
    <ContractRequestPage
      mode="edit"
      contractId={id}
      initialValues={toEditDefaults(data)}
    />
  );
}
