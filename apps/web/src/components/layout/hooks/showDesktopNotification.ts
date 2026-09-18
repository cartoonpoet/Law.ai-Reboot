import type { NotificationAlert } from "./toNotificationAlert";

/**
 * 브라우저 알림 — 다른 탭·다른 앱을 보고 있을 때 쓴다.
 * 권한을 아직 묻지 않았다면 이번 알림을 계기로 한 번 묻는다.
 * 지금 바로 띄우지 못하면 false 를 돌려주고, 호출부가 화면 안내(토스트)로 대신한다.
 */
export const showDesktopNotification = ({ title, body }: NotificationAlert): boolean => {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") {
    new Notification(title, { body, tag: "lawai-notification" });
    return true;
  }
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
  return false;
};
