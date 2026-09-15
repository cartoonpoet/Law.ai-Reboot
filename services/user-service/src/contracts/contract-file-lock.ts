import type { ContractStatus } from "@lawai/contracts";

/**
 * 계약 파일 잠금 규칙 — 계약 편집(PATCH)과 파일 업로드(presign·confirm)가 함께 쓴다.
 *
 * 체결 결재가 시작된(signing) 뒤로는 결재·서명 대상 문서가 바뀌면 안 된다. 결재자가 승인한 문서와
 * 실제로 서명·보관되는 문서가 달라지기 때문이다. 법무 검토 중(legalReview 등)에는 담당자가 계약서를
 * 교체하는 게 정상 업무(risk 재분석 트리거)라 잠그지 않는다.
 *
 * 잠금 구간에서 막는 것: 실제 파일(storageKey 있음) 제거·역할 변경, 계약서(role=contract) 신규 추가.
 * 첨부·참고서류 추가는 허용한다(체결 후 부속 서류 보관 등).
 * 메타데이터만 있는(바이트 없는) 레거시 행은 문서가 아니므로 잠그지 않는다 — 서명본 가드(§5.4)와 같은 기준.
 */
export const FILE_LOCKED_STATUSES: readonly ContractStatus[] = [
  "signing",
  "signed",
  "fulfilling",
  "closed",
];

export const isFileLockedStatus = (status: string): boolean =>
  (FILE_LOCKED_STATUSES as readonly string[]).includes(status);

export const FILE_LOCKED_CONTRACT_UPLOAD_MESSAGE =
  "체결 결재가 시작된 계약에는 계약서를 새로 올릴 수 없습니다";

interface ExistingFile {
  id: string;
  role: string;
  storageKey: string | null;
}

interface RequestedFile {
  id?: string | null;
  role: string;
}

// PATCH 로 보낸 파일 목록이 잠금 규칙을 어기면 사용자에게 보여줄 메시지를, 아니면 null.
export const getFileLockViolation = (
  status: string,
  existingFiles: ExistingFile[],
  requestedFiles: RequestedFile[],
): string | null => {
  const requestedById = new Map(
    requestedFiles
      .filter((f): f is RequestedFile & { id: string } => Boolean(f.id))
      .map((f) => [f.id, f]),
  );
  const existingById = new Map(existingFiles.map((f) => [f.id, f]));

  // 서명본 지정은 서명본 첨부(체결 완료 등록)나 체결 처리(completeSigning)로만 한다 — 상태와 무관.
  // 편집으로 첨부를 서명본으로 바꾸면 결재·체결 확인 없이 "서명본"이 생긴다.
  const promotesToSigned = existingFiles.some(
    (f) => f.role !== "signed" && requestedById.get(f.id)?.role === "signed",
  );
  if (promotesToSigned) {
    return "서명본은 편집으로 지정할 수 없습니다. 체결 처리나 서명본 첨부를 이용하세요";
  }

  if (!isFileLockedStatus(status)) return null;

  const backedFiles = existingFiles.filter((f) => f.storageKey);
  if (backedFiles.some((f) => !requestedById.has(f.id))) {
    return "체결 결재가 시작된 계약은 기존 파일을 제거할 수 없습니다";
  }
  if (backedFiles.some((f) => requestedById.get(f.id)?.role !== f.role)) {
    return "체결 결재가 시작된 계약은 파일 역할을 바꿀 수 없습니다";
  }
  const addsContractFile = requestedFiles.some(
    (f) => f.role === "contract" && (!f.id || existingById.get(f.id)?.role !== "contract"),
  );
  if (addsContractFile) return FILE_LOCKED_CONTRACT_UPLOAD_MESSAGE;

  return null;
};
