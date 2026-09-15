import { toAvatarPath, type MyProfile, type UserProfileRow } from "@lawai/contracts";

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
  avatarUrl: toAvatarPath(row.id, row.avatarKey),
});
