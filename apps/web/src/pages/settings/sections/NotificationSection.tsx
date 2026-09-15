import { Switch } from "@lawkit/ui";
import type { MyProfile } from "@lawai/contracts";
import { useProfileSettings } from "../hooks/useProfileSettings";
import * as css from "../settings.css";

interface NotificationSectionProps {
  me: MyProfile;
}

/** 알림 — 앱 안 알림은 항상 받고, 이메일로도 받을지만 고른다. */
export const NotificationSection = ({ me }: NotificationSectionProps) => {
  const { setEmailNotify, isSavingNotify } = useProfileSettings();

  return (
    <section className={css.card} aria-labelledby="settings-notifications-title">
      <div>
        <h2 id="settings-notifications-title" className={css.cardTitle}>알림</h2>
        <p className={css.cardDesc}>앱 안 알림(AI 비서의 알림 탭)은 항상 받아요. 여기서는 이메일로도 받을지 정해요.</p>
      </div>

      <div>
        <div className={css.switchRow}>
          <div className={css.switchText}>
            <span className={css.switchTitle}>이메일로도 알림 받기</span>
            <p className={css.helper}>코멘트에서 나를 언급하면 {me.email} 으로도 알려요</p>
          </div>
          {/* lawkit Switch 는 체크박스 input 에 속성을 넘긴다 — role="switch" 로 켜기·끄기 스위치임을 알린다. */}
          <Switch
            role="switch"
            aria-label="이메일로도 알림 받기"
            checked={me.emailNotify}
            disabled={isSavingNotify}
            onCheckedChange={setEmailNotify}
          />
        </div>
        <div className={css.switchRow}>
          <div className={css.switchText}>
            <span className={css.switchTitle}>알림 종류별로 고르기</span>
            <p className={css.helper}>결재만, 멘션만 받기 같은 세부 설정</p>
          </div>
          <span className={css.soonBadge}>준비 중</span>
        </div>
      </div>
    </section>
  );
};
