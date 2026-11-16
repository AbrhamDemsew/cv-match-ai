import { useQuery } from '@tanstack/react-query'
import { environment } from '../lib/env'
import { checkAppwriteConnection } from '../services/appwrite-health.service'

export const appwriteHealthQueryKey = ['appwrite', 'connection'] as const

export function useAppwriteHealth() {
  return useQuery({
    queryKey: appwriteHealthQueryKey,
    queryFn: checkAppwriteConnection,
    enabled: environment.isConfigured,
    retry: false,
    staleTime: 15_000,
  })
}
