import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Panel } from "../../components/ui/Panel";
import { getMe } from "../../api/users";
import { getContract } from "../../api/contracts";
import { contractRequestDefaults } from "./request-schema";
import { ContractRequestPage } from "./ContractRequestPage";
import { toDerivedRequestDefaults, type DerivedStageTypes } from "./toDerivedRequestDefaults";

const DERIVED_STAGES: readonly DerivedStageTypes[] = ["renew", "change", "terminate"];

const toDerivedStage = (value: string | null): DerivedStageTypes | null =>
  DERIVED_STAGES.find((stage) => stage === value) ?? null;

/**
 * 생성 모드: 현재 사용자를 검토 요청자 기본값으로 채운다.
 * `?origin=<계약 id>&stage=renew|change|terminate` 로 열면 원 계약 내용을 채운 갱신·변경·해지 요청이 된다
 * (계약 상세의 "갱신 요청"·해지 창의 "해지 합의서 법무 검토 요청" 이 이 주소로 보낸다).
 */
export function ContractCreatePage() {
  const [params] = useSearchParams();
  const originId = params.get("origin");
  const derivedStage = toDerivedStage(params.get("stage"));
  const isDerived = originId !== null && derivedStage !== null;

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
  const originQuery = useQuery({
    queryKey: ["contract", originId],
    queryFn: () => getContract(originId as string),
    enabled: isDerived,
  });

  const me = meQuery.data;
  const origin = originQuery.data;

  if (!me || (isDerived && !origin)) {
    const isLoading = meQuery.isLoading || (isDerived && originQuery.isLoading);
    const failure = isDerived && originQuery.isError ? "원 계약을 불러올 수 없습니다." : "사용자 정보를 불러올 수 없습니다.";
    return <Panel pad={18}>{isLoading ? "불러오는 중…" : failure}</Panel>;
  }

  const initialValues =
    origin && derivedStage
      ? toDerivedRequestDefaults(origin, derivedStage, me.id)
      : { ...contractRequestDefaults, requester: me.id };

  // 주소의 원 계약·단계가 바뀌면 폼을 새로 만든다(react-hook-form 기본값은 처음 한 번만 읽힌다).
  return (
    <ContractRequestPage key={`${originId ?? "new"}:${derivedStage ?? ""}`} mode="create" initialValues={initialValues} />
  );
}
