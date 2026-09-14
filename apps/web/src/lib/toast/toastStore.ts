/**
 * 전역 토스트 저장소 — React 트리 밖(queryClient 전역 onError 등)에서도 showToast() 로 알림을 쌓는다.
 * 화면은 useToasts(useSyncExternalStore)로 구독하므로 useEffect 동기화가 필요 없다.
 */

export type ToastIntentTypes = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: number;
  intent: ToastIntentTypes;
  title: string;
  description?: string;
}

export type ShowToastInput = Omit<ToastItem, "id">;

// 같은 알림이 짧은 간격으로 반복(재시도·동시 요청)되면 한 번만 띄운다.
export const DEDUPE_WINDOW_MS = 3000;
// 화면에 동시에 쌓이는 최대 개수 — 넘치면 오래된 것부터 닫는다.
export const MAX_TOASTS = 4;

let toasts: ToastItem[] = [];
let nextId = 1;
const lastShownAt = new Map<string, number>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export const showToast = (input: ShowToastInput, now: number = Date.now()) => {
  const key = `${input.intent}|${input.title}|${input.description ?? ""}`;
  const shownAt = lastShownAt.get(key);
  if (shownAt !== undefined && now - shownAt < DEDUPE_WINDOW_MS) return;
  lastShownAt.set(key, now);
  toasts = [...toasts, { ...input, id: nextId++ }].slice(-MAX_TOASTS);
  emit();
};

export const dismissToast = (id: number) => {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
};

export const subscribeToasts = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getToasts = () => toasts;

// 테스트 격리용
export const resetToasts = () => {
  toasts = [];
  lastShownAt.clear();
  emit();
};
