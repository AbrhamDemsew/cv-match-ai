import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { environment } from '../lib/env'
import { DataAuthorizationError, getDataErrorMessage } from '../lib/data-errors'
import { dataQueryKeys } from '../lib/query-keys'
import { getOrCreateProfile, updateProfile } from '../services/profile.service'

export function useProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? 'signed-out'
  const queryKey = dataQueryKeys.profile(userId)

  const profileQuery = useQuery({
    queryKey,
    queryFn: () => {
      if (!user) {
        throw new DataAuthorizationError('Sign in to load your profile.')
      }

      return getOrCreateProfile(user)
    },
    enabled: Boolean(user && environment.isDataConfigured),
    staleTime: 60_000,
    retry: 1,
  })

  const updateMutation = useMutation({
    mutationFn: (displayName: string) => {
      if (!user) {
        throw new DataAuthorizationError('Sign in to update your profile.')
      }

      return updateProfile(user, displayName)
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(dataQueryKeys.profile(profile.id), profile)
    },
  })

  return {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    errorMessage: profileQuery.isError ? getDataErrorMessage(profileQuery.error) : null,
    refetch: profileQuery.refetch,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateErrorMessage: updateMutation.isError
      ? getDataErrorMessage(updateMutation.error)
      : null,
    resetUpdateError: updateMutation.reset,
  }
}
