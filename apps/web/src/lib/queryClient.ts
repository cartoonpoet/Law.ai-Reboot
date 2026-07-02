import { QueryClient } from "@tanstack/react-query";

/**
 * 앱 전역 단일 QueryClient.
 *
 * main.tsx의 QueryClientProvider와, tiptap suggestion 드롭다운처럼 React 트리
 * 밖에서 createRoot로 마운트되는 포털 컴포넌트가 동일 캐시를 공유하도록 모듈로 분리한다.
 */
export const queryClient = new QueryClient();
