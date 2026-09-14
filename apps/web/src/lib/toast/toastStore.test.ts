import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEDUPE_WINDOW_MS,
  MAX_TOASTS,
  dismissToast,
  getToasts,
  resetToasts,
  showToast,
  subscribeToasts,
} from "./toastStore";

describe("toastStore", () => {
  beforeEach(() => resetToasts());

  it("showToast 로 쌓고 구독자에게 알린다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    showToast({ intent: "error", title: "저장 실패", description: "권한이 없습니다" }, 1000);
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ intent: "error", title: "저장 실패", description: "권한이 없습니다" });
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("같은 알림은 중복 억제 시간 안에 한 번만, 지나면 다시 띄운다", () => {
    const toast = { intent: "error" as const, title: "불러오기 실패", description: "서버 오류" };
    showToast(toast, 1000);
    showToast(toast, 1000 + DEDUPE_WINDOW_MS - 1);
    expect(getToasts()).toHaveLength(1);
    showToast(toast, 1000 + DEDUPE_WINDOW_MS);
    expect(getToasts()).toHaveLength(2);
  });

  it("최대 개수를 넘으면 오래된 것부터 뺀다", () => {
    Array.from({ length: MAX_TOASTS + 2 }, (_, i) => showToast({ intent: "info", title: `알림 ${i}` }, i));
    const titles = getToasts().map((t) => t.title);
    expect(titles).toHaveLength(MAX_TOASTS);
    expect(titles[0]).toBe("알림 2");
  });

  it("dismissToast 로 닫는다", () => {
    showToast({ intent: "success", title: "완료" }, 0);
    dismissToast(getToasts()[0].id);
    expect(getToasts()).toEqual([]);
  });
});
