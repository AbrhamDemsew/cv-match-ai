import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { environment } from '../lib/env'
import { DataAuthorizationError, getDataErrorMessage } from '../lib/data-errors'
import { dataQueryKeys } from '../lib/query-keys'
import { deleteResume, listResumes, uploadResume } from '../services/resumes.service'

interface UploadResumeVariables {
  file: File
  onProgress?: (percentage: number) => void
}

export function useResumes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? 'signed-out'
  const queryKey = dataQueryKeys.resumes(userId)

  const resumesQuery = useQuery({
    queryKey,
    queryFn: () => {
      if (!user) {
        throw new DataAuthorizationError('Sign in to load your CV library.')
      }

      return listResumes(user.id)
    },
    enabled: Boolean(user && environment.isDataConfigured),
    retry: 1,
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, onProgress }: UploadResumeVariables) => {
      if (!user) {
        throw new DataAuthorizationError('Sign in to upload a CV.')
      }

      return uploadResume(user.id, file, { onProgress })
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dataQueryKeys.resumes(userId) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (resumeId: string) => {
      if (!user) {
        throw new DataAuthorizationError('Sign in to delete a CV.')
      }

      return deleteResume(user.id, resumeId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dataQueryKeys.resumes(userId) }),
  })

  return {
    resumes: resumesQuery.data ?? [],
    isLoading: resumesQuery.isLoading,
    isError: resumesQuery.isError,
    errorMessage: resumesQuery.isError ? getDataErrorMessage(resumesQuery.error) : null,
    refetch: resumesQuery.refetch,
    uploadResume: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteResume: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
