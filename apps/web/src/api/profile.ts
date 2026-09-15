import type { MyProfile } from "@lawai/contracts";
import { apiFetch } from "./client";

// 내 정보 수정 — 바꿀 값만 보낸다(이름·이메일 알림). 이메일·부서·역할은 바꾸지 않는다.
export const updateMyProfile = (body: Partial<Pick<MyProfile, "name" | "emailNotify" | "notifyApproval" | "notifyComment" | "notifyContractExpiry">>): Promise<MyProfile> =>
  apiFetch<MyProfile>("/users/me", { method: "PATCH", body: JSON.stringify(body) });

// 프로필 사진 올리기 — 이미지를 본문에 그대로 보내면 우리 서버가 저장소(R2)에 올리고 내 사진으로 지정한다.
export const uploadMyAvatar = (file: File): Promise<MyProfile> =>
  apiFetch<MyProfile>("/users/me/avatar", {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

export const deleteMyAvatar = (): Promise<MyProfile> =>
  apiFetch<MyProfile>("/users/me/avatar", { method: "DELETE" });
