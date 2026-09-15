import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MyProfile } from "@lawai/contracts";
import { deleteMyAvatar, updateMyProfile, uploadMyAvatar } from "../../../api/profile";
import { ME_QUERY_KEY } from "../../../components/layout/hooks/useMe";
import { showToast } from "../../../lib/toast/toastStore";

// 알림 종류별 받기 — 바꾼 항목만 보낸다.
type NotifyCategoryTypes = Partial<Pick<MyProfile, "notifyApproval" | "notifyComment" | "notifyContractExpiry">>;

/**
 * 내 정보 설정의 저장 동작 — 이름·이메일 알림·알림 종류별 받기·프로필 사진.
 * 서버가 돌려준 내 정보로 캐시를 바로 바꿔 사이드바 이름·사진도 함께 갱신한다. 실패는 전역 토스트가 알린다.
 */
export const useProfileSettings = () => {
  const queryClient = useQueryClient();

  const applyProfile = (profile: MyProfile, message: string) => {
    queryClient.setQueryData(ME_QUERY_KEY, profile);
    showToast({ intent: "success", title: message });
  };

  const nameMutation = useMutation({
    mutationFn: (name: string) => updateMyProfile({ name }),
    onSuccess: (profile) => applyProfile(profile, "이름을 저장했어요"),
    meta: { errorTitle: "이름을 저장하지 못했어요" },
  });

  const notifyMutation = useMutation({
    mutationFn: (emailNotify: boolean) => updateMyProfile({ emailNotify }),
    onSuccess: (profile) =>
      applyProfile(profile, profile.emailNotify ? "이메일 알림을 켰어요" : "이메일 알림을 껐어요"),
    meta: { errorTitle: "알림 설정을 바꾸지 못했어요" },
  });

  const categoryMutation = useMutation({
    mutationFn: (settings: NotifyCategoryTypes) => updateMyProfile(settings),
    onSuccess: (profile) => applyProfile(profile, "알림 설정을 저장했어요"),
    meta: { errorTitle: "알림 설정을 바꾸지 못했어요" },
  });

  const uploadMutation = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: (profile) => applyProfile(profile, "프로필 사진을 바꿨어요"),
    meta: { errorTitle: "사진을 올리지 못했어요" },
  });

  const removeMutation = useMutation({
    mutationFn: deleteMyAvatar,
    onSuccess: (profile) => applyProfile(profile, "프로필 사진을 지웠어요"),
    meta: { errorTitle: "사진을 지우지 못했어요" },
  });

  return {
    saveName: (name: string) => nameMutation.mutate(name),
    isSavingName: nameMutation.isPending,
    setEmailNotify: (emailNotify: boolean) => notifyMutation.mutate(emailNotify),
    isSavingNotify: notifyMutation.isPending,
    setNotifyCategory: (settings: NotifyCategoryTypes) => categoryMutation.mutate(settings),
    isSavingCategory: categoryMutation.isPending,
    uploadAvatar: (file: File) => uploadMutation.mutate(file),
    removeAvatar: () => removeMutation.mutate(),
    isAvatarPending: uploadMutation.isPending || removeMutation.isPending,
  };
};
