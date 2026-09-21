import type { CreateContractInput, UpdateContractInput } from "../../api/contracts";

// 편집 저장(PATCH)에 나가는 필드를 타입으로 강제한다.
// 게이트웨이 UpdateContractDto 는 registerAs/signedAt 을 모르는 필드로 취급한다(의도적) — 체결 전환은
// 전용 finalizeRegistration/completeSigning 엔드포인트로만 이뤄져야 하고, 일반 PATCH 로 signed 를
// 세팅하면 결재 게이트를 우회하는 두 번째 경로가 생긴다. 그래서 클라이언트는 이 필드들을 보내지 않는다.
//
// `{ ...payload }` 뒤 `delete copy.registerAs` 방식은 캐스트로 타입 관계가 끊겨, Create 에 필드가
// 추가돼도 tsc 가 침묵하고 "property X should not exist" 400 이 재발한다(Task 6). 그래서 필드를 하나씩
// 명시하고, 아래 UpdateFieldsTypes 로 "Create 의 모든 필드는 보내거나 제외 목록에 있어야 한다" 를
// 컴파일러가 검사하게 한다. 새 Create 필드는 "보낸다"면 함수에 추가, "안 보낸다"면 제외 목록에 추가.
type UpdateExcludedKeyTypes =
  | "ownerId"
  | "registerAs"
  | "signedAt"
  | "originContractId"
  // 서버(게이트웨이)가 주입하는 값 — 클라이언트는 보내지 않는다.
  | "id"
  | "tenantContext";

// 편집 저장에 나가는 모든 키(하나라도 빠지면 컴파일 에러).
// 값 타입은 반환 타입(UpdateContractInput)이 검사하므로 여기선 키의 존재만 강제한다.
type UpdateFieldsTypes = Record<Exclude<keyof CreateContractInput, UpdateExcludedKeyTypes>, unknown>;

export const toUpdatePayload = (payload: CreateContractInput): UpdateContractInput => ({
  title: payload.title,
  securityLevel: payload.securityLevel,
  reviewType: payload.reviewType,
  party: payload.party,
  categoryId: payload.categoryId,
  requesterId: payload.requesterId,
  // ownerId 는 의도적으로 제외 — 편집 저장이 실제 법무 담당자를 덮어쓰면 안 된다(배정은 AssignModal 전용).
  periodStart: payload.periodStart,
  periodEnd: payload.periodEnd,
  dueDate: payload.dueDate,
  schemaVersion: payload.schemaVersion,
  details: payload.details,
  counterparties: payload.counterparties,
  approvers: payload.approvers,
  files: payload.files,
  references: payload.references,
} satisfies UpdateFieldsTypes);
