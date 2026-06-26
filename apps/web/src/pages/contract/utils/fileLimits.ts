import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_COMMENT,
} from "@lawai/contracts";

export {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_COMMENT,
};

export interface ClientFileValidation {
  ok: boolean;
  reason?: string;
}

const getExt = (name: string): string => {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
};

// 클라이언트 단 즉시 거절. mime/ext/size + 코멘트당 5개.
export const validateClientFile = (
  file: File,
  currentCount: number,
): ClientFileValidation => {
  if (currentCount >= MAX_FILES_PER_COMMENT) {
    return {
      ok: false,
      reason: `코멘트당 최대 ${MAX_FILES_PER_COMMENT}개까지 첨부할 수 있습니다`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: "50MB 이하만 첨부 가능합니다" };
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      reason: "PDF/Office/HWP/PNG/JPG 만 첨부 가능합니다",
    };
  }
  const ext = getExt(file.name);
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      ok: false,
      reason: "허용되지 않는 파일 확장자입니다",
    };
  }
  return { ok: true };
};
