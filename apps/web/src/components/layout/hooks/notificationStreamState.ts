// 실시간 연결(SSE)이 살아 있는지 — 끊겨 있으면 알림 목록을 더 자주 확인한다.
let isStreamConnected = false;

export const setStreamConnected = (connected: boolean): void => {
  isStreamConnected = connected;
};

export const checkStreamConnected = (): boolean => isStreamConnected;
