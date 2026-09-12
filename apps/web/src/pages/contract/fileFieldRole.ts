import type { FileRole } from "@lawai/contracts";

// 폼 필드명 → File.role 매핑 단일 출처. FileUploadField + useContractSubmit 공용.
export type FileFieldName = "contractFiles" | "attachFiles" | "refFiles" | "signedFiles";

export const FIELD_TO_ROLE: Record<FileFieldName, FileRole> = {
  contractFiles: "contract",
  attachFiles: "attach",
  refFiles: "ref",
  signedFiles: "signed",
};
