import { toApiUrl } from "../../api/apiUrl";
import { cx } from "../../pages/contract/cx";
import * as css from "./userAvatar.css";

type AvatarSizeTypes = "small" | "large";

interface UserAvatarProps {
  name: string | null;
  // API 기준 사진 경로(MyProfile.avatarUrl). 없으면 이름 첫 글자.
  avatarUrl: string | null;
  size: AvatarSizeTypes;
}

/** 프로필 사진 — 사진이 있으면 이미지, 없으면 이름 첫 글자. */
export const UserAvatar = ({ name, avatarUrl, size }: UserAvatarProps) =>
  avatarUrl ? (
    <img
      className={cx(css.base, css.size[size], css.image)}
      src={toApiUrl(avatarUrl)}
      alt={name ? `${name} 프로필 사진` : "프로필 사진"}
    />
  ) : (
    <span className={cx(css.base, css.size[size])} aria-hidden="true">
      {name?.charAt(0) ?? ""}
    </span>
  );
