import type { NotificationDto } from "@lawai/contracts";

// 알림 종류 → 한 줄 제목. 모르는 종류는 일반 문구로.
const TITLE: Record<string, string> = {
  approval_turn: "결재 차례가 왔어요",
  approval_referred: "결재 참조로 지정됐어요",
  approval_rejected: "결재가 반려됐어요",
  approval_completed: "결재가 끝났어요",
  comment_mention: "코멘트에서 나를 언급했어요",
  contract_expiring_90: "계약 만료 90일 전이에요",
  contract_expiring_30: "계약 만료 30일 전이에요",
  contract_expiring_7: "계약 만료가 7일 안으로 다가왔어요",
  support_reply: "문의에 답변이 달렸어요",
  advice_assigned: "자문 담당으로 배정됐어요",
  advice_followup: "자문에 추가 질의가 왔어요",
  advice_reply: "자문 요청자가 답변했어요",
  advice_answered: "자문 회신이 도착했어요",
  advice_closed: "자문이 종결됐어요",
};

const DEFAULT_TITLE = "새 알림이 왔어요";

export interface NotificationAlert {
  title: string;
  // 문서 제목·문의 제목·코멘트 미리보기 중 있는 것. 없으면 보낸 사람 이름.
  body: string;
}

const getText = (detail: NotificationDto["detail"], key: string): string => {
  const value = detail?.[key];
  return typeof value === "string" ? value : "";
};

/** 실시간으로 도착한 알림 → 화면에 띄울 한 줄(제목·내용). */
export const toNotificationAlert = (notification: NotificationDto): NotificationAlert => ({
  title: TITLE[notification.type] ?? DEFAULT_TITLE,
  body:
    getText(notification.detail, "title") ||
    getText(notification.detail, "subject") ||
    getText(notification.detail, "preview") ||
    notification.actorName ||
    "",
});
