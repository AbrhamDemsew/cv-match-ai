export const AUTH_QUERY_KEY = ['auth', 'current-user'] as const

export const dataQueryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  resumes: (userId: string) => ['resumes', userId] as const,
  jobs: (userId: string) => ['jobs', userId] as const,
  job: (userId: string, jobId: string) => ['jobs', userId, jobId] as const,
} as const
