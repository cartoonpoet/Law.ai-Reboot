import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../../api/client";
import { getAccessToken, refreshAccessToken } from "../../../api/tokens";
import { NOTIFICATIONS_QUERY_KEY } from "./useNotifications";

// EventSource 는 명령형 외부 구독이라 useEffect 정당 예외 — CLAUDE.md 승인됨.
// (그 외 useEffect/useMemo/useCallback 금지 규칙은 그대로 유지)
//
// 동작: 토큰이 있을 때만 SSE 연결을 열고, 알림이 push 되면 알림 쿼리를
// invalidate 해 NotificationBell 을 즉시 갱신한다. 폴링(useNotifications)은 백업.
// SSE push 수신 시 받은 알림 자체를 캐시에 직접 반영하지 않고 invalidate 만 한다.
// (MVP: 단순·안전 — 서버 정렬/안읽음 카운트를 재조회로 일관 보장)
//
// 토큰 만료로 CLOSED 된 경우 공유 refreshAccessToken()(apiFetch 와 같은
// single-flight 변수 = 중복 refresh 차단)으로 새 토큰을 받아 1회만 재연결한다.
// refresh 가 실패하면 더는 재시도하지 않는다(폭주·무한루프 방지). 로그인 이동은
// apiFetch 경로가 주도하므로 여기서는 중단만 하고 폴링(useNotifications)을 백업으로 둔다.
export const useNotificationStream = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 마운트 동안 살아있는 현재 연결과 정리 여부. cleanup 후 비동기 refresh 가
    // 늦게 끝나 좀비 연결을 만드는 것을 막는다.
    let eventSource: EventSource | null = null;
    let disposed = false;
    // refresh 후 재연결은 마운트당 1회만 허용(폭주 방지).
    let reconnected = false;

    const connect = (token: string) => {
      const url = `${getApiBaseUrl()}/notifications/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      eventSource = es;

      es.onmessage = () => {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      };

      // 일시적 네트워크 끊김이면 readyState 는 CONNECTING — 브라우저 기본 자동
      // 재연결에 위임한다(아무것도 안 함). 치명적 종료(CLOSED, 예: 서버가 끊음·
      // 토큰 만료)면 브라우저가 재연결하지 않으므로 명시적으로 처리한다.
      es.onerror = () => {
        // CLOSED가 아니면 일시 끊김 → 브라우저 자동 재연결에 위임(개입 안 함).
        if (es.readyState !== EventSource.CLOSED) return;
        es.close();
        // 언마운트됐거나 이미 1회 재연결을 시도했으면 중단(폭주·무한루프 방지).
        if (disposed || reconnected) return;
        // 토큰 만료 가능성 → 공유 refresh 후 1회만 재연결. 실패하면 중단(폴링 백업).
        reconnected = true;
        void refreshAccessToken()
          .then((accessToken) => {
            if (disposed) return;
            connect(accessToken);
          })
          .catch(() => {
            // refresh 실패 → 재연결 포기. 로그인 이동은 apiFetch 경로가 주도.
          });
      };
    };

    const token = getAccessToken();
    // 비로그인(토큰 없음)이면 연결하지 않는다.
    if (token) connect(token);

    // cleanup: unmount 시 연결 정리(메모리 누수·좀비 재연결 방지).
    return () => {
      disposed = true;
      eventSource?.close();
    };
  }, [queryClient]);
};
