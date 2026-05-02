import {
  QueryClient,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { handleGlobalError } from "./errorHandler";
import { CACHE_TIMES } from "@/config/constants";

export const queryClient = new QueryClient({
  // Global defaults for all queries
  defaultOptions: {
    queries: {
      // Data considered fresh for 2 minutes
      staleTime: 2 * 60 * 1000,

      // Keep in cache for 10 minutes
      gcTime: CACHE_TIMES.HEALTH_SUMMARY,

      // Retry failed requests twice
      retry: 2,

      // Smart retry delay (exponential backoff)
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch when window regains focus
      refetchOnWindowFocus: true,

      // Refetch when reconnects to internet
      refetchOnReconnect: true,

      // Don't refetch on component mount if data is still fresh
      refetchOnMount: true,
    },

    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },

  // Global error handler for ALL queries
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show error toast if query has no cached data at all
      if (!query.state.data) {
        handleGlobalError(error);
      }
    },
  }),

  // Global error handler for ALL mutations
  mutationCache: new MutationCache({
    onError: (error) => {
      handleGlobalError(error);
    },
  }),
});
