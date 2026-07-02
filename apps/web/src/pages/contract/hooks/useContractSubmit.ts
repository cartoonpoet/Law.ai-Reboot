import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FileInput } from "@lawai/contracts";
import { createContract, updateContract } from "../../../api/contracts";
import { toCreateRequest } from "../toCreateRequest";
import type { ContractRequestForm } from "../request-schema";
import { uploadContractFile } from "./uploadContractFile";
import { FIELD_TO_ROLE, type FileFieldName } from "../fileFieldRole";

interface FormFileEntry {
  id: string | null;
  name: string;
  meta: string;
  mimeType: string | null;
  blob?: unknown; // File 객체 (create 모드만)
}

// 폼의 세 필드(contractFiles/attachFiles/refFiles)를 role 과 함께 평탄화.
const flattenFormFiles = (
  form: ContractRequestForm,
): { role: FileFieldName; sortOrder: number; entry: FormFileEntry }[] => {
  const out: { role: FileFieldName; sortOrder: number; entry: FormFileEntry }[] = [];
  (["contractFiles", "attachFiles", "refFiles"] as const).forEach((field) => {
    (form[field] as FormFileEntry[]).forEach((entry, i) => {
      out.push({ role: field, sortOrder: i, entry });
    });
  });
  return out;
};

/**
 * 계약 검토 요청 제출.
 *
 * - edit 모드: toCreateRequest 결과를 그대로 PATCH (FileUploadField 가 이미 R2 업로드 완료).
 * - create 모드: 2단계 흐름
 *   1) createContract({ ...payload, files: [] }) → contract.id 확보
 *   2) blob 있는 폼 파일들을 새 id 로 presign+confirm 업로드 (Promise.allSettled 병렬)
 *   3) 업로드 결과 + metadata-only 항목을 합쳐 PATCH
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
        const saved = await updateContract(contractId, payload);
        navigate(`/contract/${saved.id}`);
        return;
      }

      // create 모드 — 2단계 흐름.
      const flat = flattenFormFiles(form);
      const blobs = flat.filter((f) => f.entry.blob instanceof File);

      // 1) 파일 빼고 계약 먼저 생성.
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
        await updateContract(created.id, { ...initialPayload, files: finalFiles });
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
