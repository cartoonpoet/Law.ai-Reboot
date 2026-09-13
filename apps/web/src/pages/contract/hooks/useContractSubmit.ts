import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ContractResponse, FileInput } from "@lawai/contracts";
import {
  createContract,
  updateContract,
  finalizeRegistration,
  type CreateContractInput,
  type UpdateContractInput,
} from "../../../api/contracts";
import { toCreateRequest } from "../toCreateRequest";
import type { ContractRequestForm } from "../request-schema";
import { uploadContractFile } from "./uploadContractFile";
import { FIELD_TO_ROLE, type FileFieldName } from "../fileFieldRole";

// 게이트웨이 UpdateContractDto 는 registerAs/signedAt 을 모르는 필드로 취급한다(선언 자체가 없음,
// 의도적 설계) — 체결 전환은 전용 finalizeRegistration/completeSigning 엔드포인트로만 이뤄지게
// 하려는 것이다. 만약 일반 PATCH 로 이 두 필드를 세팅할 수 있으면, 결재 게이트 없이 계약을
// signed 로 바꿔치기하는 두 번째 경로가 생긴다 — 이 기능 전체가 막으려는 바로 그 우회다.
// 그래서 클라이언트가 이 필드들을 절대 보내지 않아야 한다.
//
// 이전엔 `{ ...payload }` 뒤에 `delete copy.registerAs` 로 지웠는데, 그건 타입 관계를
// 끊어버린다(캐스트로 얼버무림) — CreateContractRequest 에 새 필드가 또 추가되면 tsc 가
// 아무 말 없이 조용히 PATCH 로 흘려보내고, Task 6 때 실제로 일어났던 "property X should not
// exist" 400 이 그대로 재발한다. 그래서 여기서는 UpdateContractInput 의 필드를 하나하나
// 명시해서 만든다 — 새 필드는 여기 안 적으면 자동으로 안 나간다. 컴파일러가 그 자체로 게이트다.
const toUpdatePayload = (payload: CreateContractInput): UpdateContractInput => ({
  title: payload.title,
  securityLevel: payload.securityLevel,
  reviewType: payload.reviewType,
  party: payload.party,
  categoryId: payload.categoryId,
  requesterId: payload.requesterId,
  ownerId: payload.ownerId,
  periodStart: payload.periodStart,
  periodEnd: payload.periodEnd,
  dueDate: payload.dueDate,
  schemaVersion: payload.schemaVersion,
  details: payload.details,
  counterparties: payload.counterparties,
  approvers: payload.approvers,
  files: payload.files,
  references: payload.references,
});

interface FormFileEntry {
  id: string | null;
  name: string;
  meta: string;
  mimeType: string | null;
  blob?: unknown; // File 객체 (create 모드만)
}

// 폼의 네 파일 필드(contractFiles/attachFiles/refFiles/signedFiles)를 role 과 함께 평탄화.
const flattenFormFiles = (
  form: ContractRequestForm,
): { role: FileFieldName; sortOrder: number; entry: FormFileEntry }[] => {
  const out: { role: FileFieldName; sortOrder: number; entry: FormFileEntry }[] = [];
  (["contractFiles", "attachFiles", "refFiles", "signedFiles"] as const).forEach((field) => {
    (form[field] as FormFileEntry[]).forEach((entry, i) => {
      out.push({ role: field, sortOrder: i, entry });
    });
  });
  return out;
};

// finalizeRegistration 실패를 사람이 읽을 메시지로.
const finalizeErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? `체결 완료 확정 실패: ${error.message}`
    : "체결 완료 확정에 실패했습니다.";

/**
 * 계약 검토 요청 제출.
 *
 * - edit 모드: toCreateRequest 결과를 toUpdatePayload 로 registerAs/signedAt 제거 후 PATCH
 *   (FileUploadField 가 이미 R2 업로드 완료). 저장한 계약이 아직 unassigned 인 체결 완료
 *   등록(registerAs=signed)이면, 편집 저장에서도 finalizeRegistration 을 다시 시도한다 —
 *   최초 제출 때 finalize 가 실패해(예: R2 미구성, 업로드 실패) 멈춘 계약을 편집에서 실제로
 *   복구할 수 있어야 하기 때문이다(그렇지 않으면 "편집에서 다시 시도해 주세요" 라는 안내가
 *   거짓말이 된다).
 * - create 모드: 2단계(+체결 완료 등록이면 3단계) 흐름
 *   1) createContract({ ...payload, files: [] }) → contract.id 확보. files 는 항상 비워
 *      보낸다 — presign 이 contractId 를 필요로 해서 이 시점엔 아직 실제 파일을 올릴 수
 *      없다. registerAs==="signed" 라고 특별 취급하지 않는다: 서버 create() 는 이제
 *      "서명본 첨부" 를 요구하지 않고, 항상 unassigned 로 만들 뿐이다(signedAt 도 아직 저장
 *      안 함) — 실제로 signed 로 확정하는 건 3) finalizeRegistration 이다. (예전엔 이 gate를
 *      통과시키려고 signedFiles 만 메타데이터-only 로 먼저 보내는 우회가 있었는데, 그 gate
 *      자체가 없어졌으니 더는 필요 없다.)
 *   2) blob 있는 폼 파일들을 새 id 로 presign+confirm 업로드 (Promise.allSettled 병렬),
 *      업로드 결과를 합쳐 PATCH 로 반영.
 *   3) registerAs==="signed" 면, 2)가 끝난 뒤 finalizeRegistration 을 호출해 실제로 signed 로
 *      확정한다. 서버가 "role=signed + storageKey 있는 파일" 을 다시 확인하므로, 2)의 업로드가
 *      실패했다면(예: R2 미구성) 여기서 자연히 거부된다 — 계약은 unassigned 로 남아 나중에
 *      편집에서 재시도 가능(예전처럼 파일 없는 signed 로 영구 고정되지 않는다).
 *   4) 실패가 있으면 상세 페이지로 이동하면서 router state 로 에러 메시지를 함께 넘긴다.
 *      이 훅의 setSubmitError 는 이 컴포넌트가 곧바로 navigate 로 unmount 되기 때문에 화면에
 *      보일 기회가 없다 — ContractDetailPage 가 location.state.submitError 를 읽어 배너로
 *      띄운다(그래야 실패가 실제로 사용자 눈에 보인다).
 */
export const useContractSubmit = (
  mode: "create" | "edit" = "create",
  contractId?: string,
) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 성공(에러 없음)이면 평소처럼, 에러가 있으면 상세 페이지에서 보이도록 state 로 실어 이동.
  const goToDetail = (contract: ContractResponse, errorMessage?: string) => {
    navigate(`/contract/${contract.id}`, errorMessage ? { state: { submitError: errorMessage } } : undefined);
  };

  const submit = async (form: ContractRequestForm) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (mode === "edit" && contractId) {
        const payload = toCreateRequest(form);
        const saved = await updateContract(contractId, toUpdatePayload(payload));

        if (form.registerAs === "signed" && saved.status === "unassigned") {
          try {
            const finalized = await finalizeRegistration(contractId, { signedAt: form.signedAt });
            goToDetail(finalized);
          } catch (finalizeError) {
            goToDetail(saved, finalizeErrorMessage(finalizeError));
          }
          return;
        }

        goToDetail(saved);
        return;
      }

      // create 모드 — 2단계(+체결 완료 등록이면 3단계) 흐름.
      const flat = flattenFormFiles(form);
      const blobs = flat.filter((f) => f.entry.blob instanceof File);

      // 1) 파일 빼고 계약 먼저 생성 — 언제나 unassigned(위 주석 참고).
      const initialPayload = toCreateRequest(form);
      const created = await createContract({ ...initialPayload, files: [] });

      // 2) blob 들 병렬 업로드. Promise.allSettled 로 부분 실패 격리.
      const uploadResults = await Promise.allSettled(
        blobs.map((b) =>
          uploadContractFile(
            created.id,
            FIELD_TO_ROLE[b.role],
            b.entry.blob as File,
          ),
        ),
      );

      const uploadByKey = new Map<string, string>(); // key=role:sortOrder, value=fileId
      const failedNames: string[] = [];
      uploadResults.forEach((r, i) => {
        const b = blobs[i];
        const key = `${b.role}:${b.sortOrder}`;
        if (r.status === "fulfilled") {
          uploadByKey.set(key, r.value.id);
        } else {
          failedNames.push(b.entry.name);
        }
      });

      // 3) PATCH 페이로드 — 업로드된 항목은 id 주입, 실패/blob 없음은 metadata-only.
      const finalFiles: FileInput[] = flat.map((f) => {
        const key = `${f.role}:${f.sortOrder}`;
        const uploadedId = uploadByKey.get(key);
        const id = uploadedId ?? f.entry.id ?? undefined;
        return {
          ...(id ? { id } : {}),
          role: FIELD_TO_ROLE[f.role],
          name: f.entry.name,
          meta: f.entry.meta,
          sortOrder: f.sortOrder,
        };
      });

      if (finalFiles.length > 0) {
        await updateContract(created.id, { ...toUpdatePayload(initialPayload), files: finalFiles });
      }

      const errors: string[] = [];
      if (failedNames.length > 0) {
        errors.push(`일부 첨부 업로드 실패: ${failedNames.join(", ")}.`);
      }

      // 4) 체결 완료 등록이면 실제 업로드 확인 후 signed 로 확정. 서명본 업로드가 실패했으면
      //    서버가 다시 거부한다(파일 없는 signed 로 고정되지 않고 unassigned 로 남는다).
      if (form.registerAs === "signed") {
        try {
          await finalizeRegistration(created.id, { signedAt: form.signedAt });
        } catch (finalizeError) {
          errors.push(finalizeErrorMessage(finalizeError));
        }
      }

      goToDetail(
        created,
        errors.length > 0 ? `${errors.join(" ")} 편집에서 다시 시도해 주세요.` : undefined,
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : mode === "edit"
            ? "수정 저장에 실패했습니다"
            : "검토요청 등록에 실패했습니다",
      );
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, submitError };
};
