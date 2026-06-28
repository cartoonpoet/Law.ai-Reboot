import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FileUploadArea, FileItem } from "@lawkit/ui";
import type { FileRole } from "@lawai/contracts";
import type { ContractRequestForm } from "../request-schema";
import { formatFileMeta } from "../fileMeta";
import { confirmFile, presignFile } from "../../../api/files";
import * as css from "../contractRequest.css";

type FileFieldName = "contractFiles" | "attachFiles" | "refFiles";

// 폼 필드명 → File.role 매핑 단일 출처.
const FIELD_TO_ROLE: Record<FileFieldName, FileRole> = {
  contractFiles: "contract",
  attachFiles: "attach",
  refFiles: "ref",
};

interface FileUploadFieldProps {
  name: FileFieldName;
  description?: string;
  accept?: string;
  // 편집 모드 (contractId 있음) → presign/confirm 으로 R2 업로드. 신규 작성 (contractId 없음) →
  // 메타데이터-only 폴백(폼 제출 시 id null 로 저장, 향후 batch 업로드 도입 시 교체).
  contractId?: string | null;
}

// 클라이언트에서 SHA-256 hex 계산 — presign 요청에 동봉.
const sha256Hex = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

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
          // contractId 가 없는 신규 작성 흐름 — 메타데이터-only 로 즉시 폼에 추가.
          if (!contractId) {
            field.onChange([
              ...files,
              ...added.map((f) => ({
                id: null,
                name: f.name,
                meta: formatFileMeta(f),
                mimeType: null,
              })),
            ]);
            return;
          }

          // 편집 흐름 — 파일별 presign → R2 PUT → confirm. 성공한 것만 폼에 append.
          setPendingNames((prev) => [...prev, ...added.map((f) => f.name)]);
          for (const file of added) {
            try {
              const sha256 = await sha256Hex(file);
              const presign = await presignFile({
                contractId,
                role,
                fileName: file.name,
                size: file.size,
                mimeType: file.type,
                sha256,
              });
              const putRes = await fetch(presign.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
              });
              if (!putRes.ok) throw new Error(`업로드 실패 (${putRes.status})`);
              const etag =
                putRes.headers.get("etag")?.replace(/^"|"$/g, "") || sha256;
              const att = await confirmFile({
                uploadToken: presign.uploadToken,
                etag,
              });
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
