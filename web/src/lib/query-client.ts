import { QueryClient } from '@tanstack/react-query'

/**
 * Shared server-state cache. Queries should opt out of retries when a failure
 * is meaningful to the user (for example, the configuration diagnostic).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
