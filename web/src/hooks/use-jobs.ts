import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { environment } from '../lib/env'
import { DataAuthorizationError, getDataErrorMessage } from '../lib/data-errors'
import { dataQueryKeys } from '../lib/query-keys'
import {
  createJob,
  deleteJob,
  getJobWithRequirements,
  listJobs,
  updateJob,
} from '../services/jobs.service'
import type { AuthUser } from '../types/auth'
import type { JobInput } from '../types/data'

function requireUser(user: AuthUser | null, action: string): AuthUser {
  if (!user) {
    throw new DataAuthorizationError(`Sign in to ${action}.`)
  }

  return user
}

export function useJobs() {
  const { user } = useAuth()
  const userId = user?.id ?? 'signed-out'

  const jobsQuery = useQuery({
    queryKey: dataQueryKeys.jobs(userId),
    queryFn: () => {
      const currentUser = requireUser(user, 'load your jobs')
      return listJobs(currentUser.id)
    },
    enabled: Boolean(user && environment.isDataConfigured),
    retry: 1,
  })

  return {
    jobs: jobsQuery.data ?? [],
    isLoading: jobsQuery.isLoading,
    isError: jobsQuery.isError,
    errorMessage: jobsQuery.isError ? getDataErrorMessage(jobsQuery.error) : null,
    refetch: jobsQuery.refetch,
  }
}

export function useJob(jobId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id ?? 'signed-out'

  const jobQuery = useQuery({
    queryKey: dataQueryKeys.job(userId, jobId ?? 'missing'),
    queryFn: () => {
      const currentUser = requireUser(user, 'load this job')
      if (!jobId) {
        throw new DataAuthorizationError('The job reference is missing.')
      }

      return getJobWithRequirements(currentUser.id, jobId)
    },
    enabled: Boolean(user && jobId && environment.isDataConfigured),
    retry: 1,
  })

  return {
    job: jobQuery.data ?? null,
    isLoading: jobQuery.isLoading,
    isError: jobQuery.isError,
    errorMessage: jobQuery.isError ? getDataErrorMessage(jobQuery.error) : null,
    refetch: jobQuery.refetch,
  }
}

export function useCreateJob() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? 'signed-out'

  const mutation = useMutation({
    mutationFn: (input: JobInput) => {
      const currentUser = requireUser(user, 'create a job')
      return createJob(currentUser.id, input)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: dataQueryKeys.jobs(userId) }),
  })

  return {
    createJob: mutation.mutateAsync,
    isCreating: mutation.isPending,
  }
}

export function useUpdateJob(jobId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? 'signed-out'

  const mutation = useMutation({
    mutationFn: (input: JobInput) => {
      const currentUser = requireUser(user, 'update this job')
      return updateJob(currentUser.id, jobId, input)
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: dataQueryKeys.jobs(userId) }),
        queryClient.invalidateQueries({ queryKey: dataQueryKeys.job(userId, jobId) }),
      ]),
  })

  return {
    updateJob: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  }
}

export function useDeleteJob() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? 'signed-out'

  const mutation = useMutation({
    mutationFn: (jobId: string) => {
      const currentUser = requireUser(user, 'delete this job')
      return deleteJob(currentUser.id, jobId)
    },
    onSuccess: (_, jobId) => {
      queryClient.removeQueries({ queryKey: dataQueryKeys.job(userId, jobId) })
      return queryClient.invalidateQueries({ queryKey: dataQueryKeys.jobs(userId) })
    },
  })

  return {
    deleteJob: mutation.mutateAsync,
    isDeleting: mutation.isPending,
  }
}
