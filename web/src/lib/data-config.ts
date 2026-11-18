import { environment } from './env'
import { DataConfigurationError } from './data-errors'

/**
 * Stable table and bucket IDs from instruction.md. Keeping them here prevents
 * IDs from being scattered through pages and service modules.
 */
export const TABLE_IDS = {
  profiles: 'profiles',
  resumes: 'resumes',
  jobs: 'jobs',
  jobRequirements: 'job_requirements',
  analyses: 'analyses',
  requirementMatches: 'requirement_matches',
  recommendations: 'recommendations',
  reports: 'reports',
} as const

export function requireDatabaseId(): string {
  if (!environment.databaseId) {
    throw new DataConfigurationError(
      'The Appwrite database ID is missing. Add VITE_APPWRITE_DATABASE_ID and restart the dev server.',
    )
  }

  return environment.databaseId
}

export function requireResumesBucketId(): string {
  if (!environment.resumesBucketId) {
    throw new DataConfigurationError(
      'The CV storage bucket ID is missing. Add VITE_APPWRITE_RESUMES_BUCKET_ID and restart the dev server.',
    )
  }

  return environment.resumesBucketId
}

export function isDataConfigured(): boolean {
  return environment.isDataConfigured
}
