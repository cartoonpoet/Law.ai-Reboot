// 계약 파일 수정 정책(순수) — update() 가 쓰기 전에 "거부 사유 메시지"를 얻는 함수들.
// DB 조회는 호출부(ContractCommandService)가 하고, 여기서는 조회 결과와 요청만으로 판정한다.
import type { FileInput } from "@lawai/contracts";

// role="contract"(계약서 본문) 파일이 실제로 교체됐는지 판정.
// 추가(신규 업로드) / 제거 / 다른 파일의 role 을 contract 로 승격 — 셋 다 "문서가 바뀜"으로 본다.
// 파일을 건드리지 않은 수정(제목/기간 등)이나 이름·정렬만 바뀐 경우는 false.
export const isContractFileReplaced = (
  currentFiles: { id: string; role: string }[],
  nextFiles: FileInput[],
): boolean => {
  const currentContractIds = new Set(
    currentFiles.filter((f) => f.role === "contract").map((f) => f.id),
  );
  const nextContractIds = new Set(
    nextFiles
      .filter((f) => f.role === "contract")
      .map((f) => f.id)
      .filter((id): id is string => Boolean(id)),
  );
  const hasNewUpload = nextFiles.some((f) => f.role === "contract" && !f.id);
  const hasRemoved = [...currentContractIds].some((id) => !nextContractIds.has(id));
  const hasPromoted = [...nextContractIds].some((id) => !currentContractIds.has(id));
  return hasNewUpload || hasRemoved || hasPromoted;
};

// "추가 전용" 모드(editIsAdditiveOnly — 미배정 생성자 완화로만 canEdit 을 얻은 경우, authz 참고):
// 기존 파일은 하나도 제거할 수 없다. role 무관하게 전부 보호한다.
export const getAdditiveOnlyViolation = (
  existingFiles: { id: string }[],
  keepIds: string[],
): string | null => {
  const keepIdSet = new Set(keepIds);
  const wouldRemoveExisting = existingFiles.some((f) => !keepIdSet.has(f.id));
  return wouldRemoveExisting ? "이 상태에서는 파일을 추가할 수만 있고 제거할 수 없습니다" : null;
};

// 서명본(role=signed) 보호 — 이미 R2 에 올라간 서명 원본이 PATCH 로 조용히 사라지는 사고를 막는다.
// 실제 바이트가 있는(storageKey not null) 서명본이 있으면:
//  (a) 기존 서명본의 role 을 바꿀 수 없다,
//  (b) 바이트 있는 기존 서명본 중 최소 하나를 id 로 유지해야 한다(id 없는 메타데이터 항목은 개수에 치지 않는다).
// 바이트 있는 서명본이 없고 메타데이터-only 서명본만 있으면(레거시) signed 항목을 0개로 만드는 PATCH 만 막는다.
export const getSignedFileViolation = (
  existingSignedFiles: { id: string; storageKey: string | null }[],
  requestedFiles: FileInput[],
): string | null => {
  if (existingSignedFiles.length === 0) return null;
  const signedRemovalMessage = "서명본 파일은 이 요청으로 제거할 수 없습니다";
  const requestedById = new Map(
    requestedFiles.filter((f) => f.id).map((f) => [f.id as string, f]),
  );
  const hasBackedSignedFile = existingSignedFiles.some((f) => f.storageKey);
  if (hasBackedSignedFile) {
    const isDemoting = existingSignedFiles.some((f) => {
      const requested = requestedById.get(f.id);
      return requested !== undefined && requested.role !== "signed";
    });
    if (isDemoting) return "서명본 파일의 역할은 변경할 수 없습니다";
    const keepsBackedSignedFile = existingSignedFiles.some(
      (f) => f.storageKey && requestedById.get(f.id)?.role === "signed",
    );
    return keepsBackedSignedFile ? null : signedRemovalMessage;
  }
  return requestedFiles.some((f) => f.role === "signed") ? null : signedRemovalMessage;
};
