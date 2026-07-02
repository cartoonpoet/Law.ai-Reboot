import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FileUploadArea, FileItem } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { FIELD_TO_ROLE, type FileFieldName } from "../fileFieldRole";
import { formatFileMeta } from "../fileMeta";
import { uploadContractFile } from "../hooks/uploadContractFile";
import * as css from "../contractRequest.css";

interface FileUploadFieldProps {
  name: FileFieldName;
  description?: string;
  accept?: string;
  // 편집 모드 (contractId 있음) → presign/confirm 으로 R2 업로드. 신규 작성 (contractId 없음) →
  // blob 을 폼에 보관 후 submit 시점에 일괄 업로드(useContractSubmit 의 2단계 흐름).
  contractId?: string | null;
}

export function FileUploadField({
  name,
  description,
  accept,
  contractId,
}: FileUploadFieldProps) {
  const { control } = useFormContext<ContractRequestForm>();
  const role = FIELD_TO_ROLE[name];
  const [pendingNames, setPendingNames] = useState<string[]>([]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const files = field.value;

        const handleFilesAdded = async (added: File[]) => {
          // contractId 가 없는 신규 작성 흐름 — blob 을 폼에 보관해서 submit 시점에 일괄 업로드.
          // 표준양식 모달 등 blob 없이 추가되는 케이스도 그대로 metadata-only 로 함께 처리.
          if (!contractId) {
            field.onChange([
              ...files,
              ...added.map((f) => ({
                id: null,
                name: f.name,
                meta: formatFileMeta(f),
                mimeType: null,
                blob: f,
              })),
            ]);
            return;
          }

          // 편집 흐름 — 파일별 presign → R2 PUT → confirm (uploadContractFile 헬퍼). 성공한 것만 폼에 append.
          setPendingNames((prev) => [...prev, ...added.map((f) => f.name)]);
          for (const file of added) {
            try {
              const att = await uploadContractFile(contractId, role, file);
              field.onChange([
                ...field.value,
                {
                  id: att.id,
                  name: att.name,
                  meta: formatFileMeta(file),
                  mimeType: att.mimeType,
                },
              ]);
            } catch (err) {
              window.alert(
                `${file.name} 업로드 실패: ${
                  err instanceof Error ? err.message : "알 수 없는 오류"
                }`,
              );
            } finally {
              setPendingNames((prev) => {
                const idx = prev.indexOf(file.name);
                if (idx < 0) return prev;
                const next = [...prev];
                next.splice(idx, 1);
                return next;
              });
            }
          }
        };

        const handleDelete = (target: number) =>
          field.onChange(files.filter((_, index) => index !== target));

        return (
          <FileUploadArea
            variant="basic"
            accept={accept}
            description={description}
            onFilesAdded={handleFilesAdded}
          >
            {(files.length > 0 || pendingNames.length > 0) && (
              <div className={css.fileList}>
                {files.map((file, index) => (
                  <FileItem
                    key={`${file.id ?? file.name}-${index}`}
                    filename={file.name}
                    fileMeta={file.meta}
                    onDelete={() => handleDelete(index)}
                  />
                ))}
                {pendingNames.map((n, i) => (
                  <FileItem
                    key={`pending-${n}-${i}`}
                    filename={n}
                    fileMeta="업로드 중…"
                  />
                ))}
              </div>
            )}
          </FileUploadArea>
        );
      }}
    />
  );
}
