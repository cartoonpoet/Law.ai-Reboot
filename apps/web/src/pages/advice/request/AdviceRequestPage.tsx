import { Panel } from "../../../components/ui/Panel";
import { useMe } from "../../../components/layout/hooks/useMe";
import { createAdviceRequestDefaults } from "./adviceRequestSchema";
import { AdviceRequestForm } from "./AdviceRequestForm";

/** /advice/request — 로그인한 사람을 요청자로 채운 폼을 연다(기본값은 폼이 처음 한 번만 읽으므로 사용자 정보가 온 뒤 렌더). */
export const AdviceRequestPage = () => {
  const { me } = useMe();
  if (!me) return <Panel pad={18}>불러오는 중…</Panel>;
  return <AdviceRequestForm initialValues={createAdviceRequestDefaults(me)} />;
};
