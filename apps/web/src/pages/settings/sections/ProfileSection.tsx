import { useState } from "react";
import type { ChangeEvent } from "react";
import { Button, Input, InputGroup } from "@lawkit/ui";
import type { MyProfile } from "@lawai/contracts";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import { AVATAR_ACCEPT, getAvatarFileError } from "../avatarFile";
import { useProfileSettings } from "../hooks/useProfileSettings";
import { ReadOnlyField } from "./ReadOnlyField";
import * as css from "../settings.css";

const NAME_MIN_LENGTH = 2;

interface ProfileSectionProps {
  me: MyProfile;
}

/** 내 정보 — 프로필 사진 · 이름(바꿀 수 있음) · 이메일·부서(보기만). */
export const ProfileSection = ({ me }: ProfileSectionProps) => {
  const { saveName, isSavingName, uploadAvatar, removeAvatar, isAvatarPending } = useProfileSettings();
  const [name, setName] = useState(me.name);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // 같은 파일을 다시 골라도 onChange 가 오도록 선택할 때마다 file input 을 새로 만든다(DOM 값 직접 조작 대신).
  const [fileInputKey, setFileInputKey] = useState(0);

  const trimmedName = name.trim();
  const canSaveName = trimmedName.length >= NAME_MIN_LENGTH && trimmedName !== me.name && !isSavingName;

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileInputKey((prev) => prev + 1);
    if (!file) return;
    const error = getAvatarFileError(file);
    setAvatarError(error);
    if (!error) uploadAvatar(file);
  };

  const handleSaveName = () => {
    if (canSaveName) saveName(trimmedName);
  };

  return (
    <section className={css.card} aria-labelledby="settings-profile-title">
      <div>
        <h2 id="settings-profile-title" className={css.cardTitle}>내 정보</h2>
        <p className={css.cardDesc}>다른 사람에게 보이는 사진과 이름이에요. 결재선·코멘트·알림에 쓰여요.</p>
      </div>

      <div className={css.profileRow}>
        <UserAvatar name={me.name} avatarUrl={me.avatarUrl} size="large" />
        <div className={css.avatarControls}>
          <div className={css.avatarButtons}>
            <label className={css.fileButton}>
              {isAvatarPending ? "처리 중…" : me.avatarUrl ? "사진 변경" : "사진 올리기"}
              <input
                key={fileInputKey}
                type="file"
                accept={AVATAR_ACCEPT}
                className={css.fileInput}
                disabled={isAvatarPending}
                onChange={handleAvatarChange}
                aria-label="프로필 사진 파일 선택"
              />
            </label>
            {me.avatarUrl && (
              <Button type="button" size="small" variant="outline" color="secondary" disabled={isAvatarPending} onClick={removeAvatar}>
                사진 삭제
              </Button>
            )}
          </div>
          <p className={css.helper}>PNG·JPG·WEBP, 2MB 이하</p>
          {avatarError && <p role="alert" className={css.errorText}>{avatarError}</p>}
        </div>
      </div>

      <form action={handleSaveName} className={css.form}>
        <InputGroup label="이름">
          <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="이름" />
        </InputGroup>

        <div className={css.grid2}>
          <ReadOnlyField label="이메일 (로그인 아이디)" value={me.email} note="변경 불가" />
          <ReadOnlyField label="부서" value={me.departmentName ?? "지정되지 않음"} note="관리자가 지정" />
        </div>

        <div className={css.actions}>
          <Button type="submit" disabled={!canSaveName}>
            {isSavingName ? "저장 중…" : "저장"}
          </Button>
        </div>
      </form>
    </section>
  );
};
