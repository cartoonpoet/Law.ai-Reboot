import { describe, expect, it } from "vitest";
import type { NotificationDto } from "@lawai/contracts";
import { toNotificationAlert } from "./toNotificationAlert";

const make = (over: Partial<NotificationDto>): NotificationDto => ({
  id: "n1",
  type: "advice_answered",
  actorId: "u1",
  actorName: "박지훈",
  targetType: "Advice",
  targetId: "a1",
  detail: { adviceId: "a1", title: "준거법 문의" },
  isRead: false,
  isTargetDeleted: false,
  createdAt: "2026-09-19T00:00:00.000Z",
  ...over,
});

describe("toNotificationAlert", () => {
  it("종류에 맞는 제목과 문서 제목을 보여준다", () => {
    expect(toNotificationAlert(make({}))).toEqual({ title: "자문 회신이 도착했어요", body: "준거법 문의" });
  });

  it("문의는 제목(subject), 코멘트는 미리보기를 쓴다", () => {
    expect(toNotificationAlert(make({ type: "support_reply", detail: { subject: "오류 문의" } })).body).toBe("오류 문의");
    expect(toNotificationAlert(make({ type: "comment_mention", detail: { preview: "확인 부탁드려요" } })).body).toBe(
      "확인 부탁드려요",
    );
  });

  it("모르는 종류는 일반 문구, 내용이 없으면 보낸 사람 이름", () => {
    expect(toNotificationAlert(make({ type: "unknown_kind", detail: null }))).toEqual({
      title: "새 알림이 왔어요",
      body: "박지훈",
    });
  });
});
