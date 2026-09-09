import type { TenantRole } from "@lawai/contracts";

// 테넌트 내 역할의 화면 표시용 한국어 라벨. Record 로 강제해 role 추가 시 컴파일 에러로 누락을 잡는다.
const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  general: "일반",
  contractManager: "계약담당자",
  inHouseCounsel: "사내변호사",
  outsideCounsel: "사외변호사",
  sealManager: "날인담당자",
};

export const getTenantRoleLabel = (role: TenantRole): string =>
  TENANT_ROLE_LABELS[role];
