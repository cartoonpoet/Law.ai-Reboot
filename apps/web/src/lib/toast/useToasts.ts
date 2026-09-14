import { useSyncExternalStore } from "react";
import { getToasts, subscribeToasts } from "./toastStore";

/** 전역 토스트 목록 구독(useSyncExternalStore — effect 동기화 없음). */
export const useToasts = () => useSyncExternalStore(subscribeToasts, getToasts, getToasts);
