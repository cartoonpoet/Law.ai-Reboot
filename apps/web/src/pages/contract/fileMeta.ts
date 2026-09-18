// 첨부 파일 메타 표기 유틸: "DOCX · 1.2MB"

/** 바이트 → "1.2MB" 표기. 이름과 크기를 따로 가진 저장된 첨부(자문 등)도 쓴다. */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
};

/** File → "확장자 · 용량" 표기 (예: "DOCX · 1.2MB") */
export const formatFileMeta = (file: File): string => {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toUpperCase()
    : "FILE";
  return `${ext} · ${formatBytes(file.size)}`;
};
