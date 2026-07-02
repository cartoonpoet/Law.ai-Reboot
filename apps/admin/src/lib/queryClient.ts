import { QueryClient } from "@tanstack/react-query";

// 전역 단일 QueryClient — apps/web 와 동일 패턴.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
