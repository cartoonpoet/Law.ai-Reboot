import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FileInput } from "@lawai/contracts";
import {
  createContract,
  updateContract,
  type CreateContractInput,
  type UpdateContractInput,
} from "../../../api/contracts";
import { toCreateRequest } from "../toCreateRequest";
import type { ContractRequestForm } from "../request-schema";
import { uploadContractFile } from "./uploadContractFile";
import { FIELD_TO_ROLE, type FileFieldName } from "../fileFieldRole";

// 게이트웨이 UpdateContractDto 는 registerAs/signedAt 을 모르는 필드로 취급한다(선언 자체가 없음) —
// 체결 전환은 전용 completeSigning 엔드포인트로만 이뤄지게 하려는 의도적 설계이고, 전역
// ValidationPipe 가 whitelist:true, forbidNonWhitelisted:true 라 모르는 프로퍼티는 400 으로 거부된다.
// toCreateRequest() 는 생성 payload 겸용이라 이 두 필드를 항상 포함하므로, PATCH(updateContract)
// 로 보내기 전에는 반드시 제거해야 한다 — 안 그러면 "property registerAs should not exist" 400.
const toUpdatePayload = (payload: CreateContractInput): UpdateContractInput => {
  const copy: Partial<CreateContractInput> = { ...payload };
  delete copy.registerAs;
  delete copy.signedAt;
  return copy as UpdateContractInput;
};

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

/**
 * 계약 검토 요청 제출.
 *
 * - edit 모드: toCreateRequest 결과를 toUpdatePayload 로 registerAs/signedAt 제거 후 PATCH
 *   (FileUploadField 가 이미 R2 업로드 완료).
 * - create 모드: 2단계 흐름
 *   1) createContract({ ...payload, files: createFiles }) → contract.id 확보.
 *      files 는 기본적으로 비워 보내지만(presign 은 contractId 가 있어야 가능하므로 blob 은
 *      아직 못 올림), registerAs === "signed" 는 예외다 — 서버가 create 시점에
 *      req.files.some(f => f.role === "signed") 를 요구하는 검증 게이트가 있어서
 *      (체결 완료 등록은 검토·결재 없이 바로 상태가 확정되는 경로라 여기서 못 막으면 영영 못 막음),
 *      role="signed" 항목만 메타데이터-only(파일명/메타, id 없음)로 먼저 실어 보낸다.
 *      그 결과 R2 객체 없는 임시 File 행이 잠깐 생기지만, 뒤이은 2)~3) 업로드+PATCH 가
 *      끝나면 PATCH 의 "keepIds 에 없는 기존 File 은 삭제" 규칙(contracts.service.ts update())에
 *      따라 자동으로 치워진다 — 별도 정리 코드 불필요.
 *   2) blob 있는 폼 파일들을 새 id 로 presign+confirm 업로드 (Promise.allSettled 병렬)
 *   3) 업로드 결과 + metadata-only 항목을 합쳐 PATCH — 1)에서 만든 임시 signed 메타 행은
 *      새 id 로 대체되며 PATCH 의 전체 교체 규칙에 의해 삭제된다.
 *   4) 부분 실패 시 contract 는 살아있고 부분 성공 메시지 후 상세 페이지로 — 편집에서 재시도 가능
 */
export const useContractSubmit = (
  mode: "create" | "edit" = "create",
  contractId?: string,
) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async (form: ContractRequestForm) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (mode === "edit" && contractId) {
        const payload = toCreateRequest(form);
        const saved = await updateContract(contractId, toUpdatePayload(payload));
        navigate(`/contract/${saved.id}`);
        return;
      }

      // create 모드 — 2단계 흐름.
      const flat = flattenFormFiles(form);
      const blobs = flat.filter((f) => f.entry.blob instanceof File);

      // 1) 계약 먼저 생성 — 서명본(role=signed)만 메타데이터-only 로 동봉(위 주석 참고),
      //    나머지(계약서/첨부/참고)는 blob 업로드 전이라 비워서 보낸다.
      const initialPayload = toCreateRequest(form);
      const createFiles = initialPayload.files.filter((f) => f.role === "signed");
      const created = await createContract({ ...initialPayload, files: createFiles });

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

      if (failedNames.length > 0) {
        // 부분 성공 — contract 는 생성됐지만 일부 첨부 실패. 상세로 이동하되 에러 표시.
        setSubmitError(
          `계약은 생성됐지만 일부 첨부 업로드 실패: ${failedNames.join(", ")}. 편집에서 다시 업로드해 주세요.`,
        );
      }
      navigate(`/contract/${created.id}`);
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
