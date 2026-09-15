import type { MyProfile, UserProfileRow } from "@lawai/contracts";

// avatars/<userId>/<파일> 키 → 공개 이미지 경로(API 기준). 키가 올릴 때마다 바뀌어 캐시가 자연히 갱신된다.
const toAvatarUrl = (row: UserProfileRow): string | null => {
  if (!row.avatarKey) return null;
  const fileName = row.avatarKey.split("/").at(-1);
  return fileName ? `/users/${row.id}/avatar/${encodeURIComponent(fileName)}` : null;
};

// user-service 내 정보 행 → 화면에 내보내는 MyProfile(R2 키는 감추고 이미지 주소만).
export const toMyProfile = (row: UserProfileRow): MyProfile => ({
  id: row.id,
  email: row.email,
  name: row.name,
  isSystemAdmin: row.isSystemAdmin,
  departmentId: row.departmentId,
  departmentName: row.departmentName,
  createdAt: row.createdAt,
  emailNotify: row.emailNotify,
  avatarUrl: toAvatarUrl(row),
});
