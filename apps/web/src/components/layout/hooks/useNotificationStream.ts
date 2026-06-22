import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../../api/client";
import { NOTIFICATIONS_QUERY_KEY } from "./useNotifications";

// EventSource 는 명령형 외부 구독이라 useEffect 정당 예외 — CLAUDE.md 승인됨.
// (그 외 useEffect/useMemo/useCallback 금지 규칙은 그대로 유지)
//
// 동작: 토큰이 있을 때만 SSE 연결을 열고, 알림이 push 되면 알림 쿼리를
// invalidate 해 NotificationBell 을 즉시 갱신한다. 폴링(useNotifications)은 백업.
// SSE push 수신 시 받은 알림 자체를 캐시에 직접 반영하지 않고 invalidate 만 한다.
// (MVP: 단순·안전 — 서버 정렬/안읽음 카운트를 재조회로 일관 보장)
//
// 제약(의도된 동작): 토큰은 "마운트 시점에 1회만" 읽는다. 로그인/로그아웃으로
// 토큰이 바뀌어도 자동 재연결하지 않는다 — 벨이 로그인 셸에서만(인증된 상태로)
// 마운트되는 전제에 의존한다. 토큰 만료 후 갱신·재연결은 후속 과제(폴링이 백업).
export const useNotificationStream = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    // 비로그인(토큰 없음)이면 연결하지 않는다.
    if (!token) return;

    const url = `${getApiBaseUrl()}/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    };

    // 일시적 네트워크 끊김이면 readyState 는 CONNECTING — 브라우저 기본 자동
    // 재연결에 위임한다(아무것도 안 함). 치명적 종료(CLOSED, 예: 서버가 끊음·
    // 토큰 만료)면 브라우저가 재연결을 시도하지 않으므로 명시적으로 정리한다.
    // (토큰 만료 후 갱신·재연결은 위험/결정 보류 — MVP 는 폴링 백업으로 손실 방지.)
    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        eventSource.close();
      }
    };

    // cleanup: unmount 시 연결 정리(메모리 누수 방지).
    return () => eventSource.close();
  }, [queryClient]);
};
