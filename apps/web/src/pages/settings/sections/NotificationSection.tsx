import { Switch } from "@lawkit/ui";
import type { MyProfile } from "@lawai/contracts";
import { useProfileSettings } from "../hooks/useProfileSettings";
import * as css from "../settings.css";

interface NotificationSectionProps {
  me: MyProfile;
}

/** 알림 — 종류별(결재·코멘트)로 받을지, 이메일로도 받을지 고른다. */
export const NotificationSection = ({ me }: NotificationSectionProps) => {
  const { setEmailNotify, isSavingNotify, setNotifyCategory, isSavingCategory } = useProfileSettings();

  return (
    <section className={css.card} aria-labelledby="settings-notifications-title">
      <div>
        <h2 id="settings-notifications-title" className={css.cardTitle}>알림</h2>
        <p className={css.cardDesc}>AI 비서의 알림 탭으로 받을 알림 종류를 고르고, 이메일로도 받을지 정해요.</p>
      </div>

      {/* lawkit Switch 는 체크박스 input 에 속성을 넘긴다 — role="switch" 로 켜기·끄기 스위치임을 알린다. */}
      <div>
        <div className={css.switchRow}>
          <div className={css.switchText}>
            <span className={css.switchTitle}>결재 알림 받기</span>
            <p className={css.helper}>내 결재 차례, 올린 결재의 반려·완료, 참조로 들어간 결재를 알려요</p>
          </div>
          <Switch
            role="switch"
            aria-label="결재 알림 받기"
            checked={me.notifyApproval}
            disabled={isSavingCategory}
            onCheckedChange={(checked) => setNotifyCategory({ notifyApproval: checked })}
          />
        </div>
        <div className={css.switchRow}>
          <div className={css.switchText}>
            <span className={css.switchTitle}>코멘트 알림 받기</span>
            <p className={css.helper}>코멘트에서 나를 언급하면 알려요. 끄면 이메일도 보내지 않아요</p>
          </div>
          <Switch
            role="switch"
            aria-label="코멘트 알림 받기"
            checked={me.notifyComment}
            disabled={isSavingCategory}
            onCheckedChange={(checked) => setNotifyCategory({ notifyComment: checked })}
          />
        </div>
        <div className={css.switchRow}>
          <div className={css.switchText}>
            <span className={css.switchTitle}>이메일로도 알림 받기</span>
            <p className={css.helper}>코멘트에서 나를 언급하면 {me.email} 으로도 알려요</p>
          </div>
          <Switch
            role="switch"
            aria-label="이메일로도 알림 받기"
            checked={me.emailNotify}
            disabled={isSavingNotify}
            onCheckedChange={setEmailNotify}
          />
        </div>
      </div>
    </section>
  );
};
