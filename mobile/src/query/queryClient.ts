import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/http";

/**
 * Shared TanStack Query client. Never retry auth failures (a 401/403 won't fix
 * itself on retry) or client errors; back off on transient/server errors only.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          const status = error.status ?? 0;
          if (status === 401 || status === 403 || status === 404) return false;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: false,
    },
  },
});
