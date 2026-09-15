import { toApiUrl } from "../../api/apiUrl";
import { cx } from "../../pages/contract/cx";
import * as css from "./userAvatar.css";

type AvatarSizeTypes = "small" | "large";

interface UserAvatarProps {
  name: string | null;
  // API 기준 사진 경로(MyProfile.avatarUrl 등). 없으면 이름 첫 글자.
  avatarUrl: string | null;
  size: AvatarSizeTypes;
  // 바로 옆에 이름이 보이면 true — 화면 낭독기가 이름을 두 번 읽지 않게 사진을 장식으로 둔다.
  isDecorative: boolean;
}

/** 프로필 사진 — 사진이 있으면 이미지, 없으면 이름 첫 글자. */
export const UserAvatar = ({ name, avatarUrl, size, isDecorative }: UserAvatarProps) => {
  const alt = isDecorative ? "" : name ? `${name} 프로필 사진` : "프로필 사진";

  return avatarUrl ? (
    <img className={cx(css.base, css.size[size], css.image)} src={toApiUrl(avatarUrl)} alt={alt} />
  ) : (
    <span className={cx(css.base, css.size[size])} aria-hidden="true">
      {name?.charAt(0) ?? ""}
    </span>
  );
};
