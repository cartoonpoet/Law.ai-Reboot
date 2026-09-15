import { AVATAR_MIME_TYPES, MAX_AVATAR_SIZE_BYTES } from "@lawai/contracts";

export const AVATAR_ACCEPT = AVATAR_MIME_TYPES.join(",");

// 올리기 전에 형식·크기를 확인한다(서버도 다시 확인). 문제가 없으면 null.
export const getAvatarFileError = (file: File): string | null => {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) return "PNG·JPG·WEBP 이미지만 올릴 수 있어요";
  if (file.size > MAX_AVATAR_SIZE_BYTES) return "2MB 이하 사진만 올릴 수 있어요";
  return null;
};
