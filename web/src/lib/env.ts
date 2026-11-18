import { z } from 'zod'

/**
 * Names of the public Appwrite settings exposed to the browser.
 *
 * Everything prefixed with `VITE_` is embedded in the frontend bundle and is
 * public by definition. Never add server API keys or Gemini credentials here.
 */
export const ENV_KEYS = {
  endpoint: 'VITE_APPWRITE_ENDPOINT',
  projectId: 'VITE_APPWRITE_PROJECT_ID',
  databaseId: 'VITE_APPWRITE_DATABASE_ID',
  resumesBucketId: 'VITE_APPWRITE_RESUMES_BUCKET_ID',
  reportsBucketId: 'VITE_APPWRITE_REPORTS_BUCKET_ID',
  analyzeFunctionId: 'VITE_APPWRITE_ANALYZE_FUNCTION_ID',
} as const

export type PublicEnvKey = (typeof ENV_KEYS)[keyof typeof ENV_KEYS]

export interface EnvironmentIssue {
  variable: PublicEnvKey
  message: string
  severity: 'error' | 'warning'
}

export interface AppwriteEnvironment {
  endpoint: string | null
  projectId: string | null
  databaseId: string | null
  resumesBucketId: string | null
  reportsBucketId: string | null
  analyzeFunctionId: string | null
  /** True when the endpoint and project ID needed by authentication are valid. */
  isConfigured: boolean
  /** True when the database and private resumes bucket needed by Phase 3 are valid. */
  isDataConfigured: boolean
  issues: EnvironmentIssue[]
}

const endpointSchema = z
  .string()
  .trim()
  .min(1, 'Add the Appwrite API endpoint to web/.env.local.')
  .refine(isHttpUrl, 'Enter an absolute http(s) URL, for example https://fra.cloud.appwrite.io/v1.')
  .transform((value) => value.replace(/\/+$/, ''))

const projectIdSchema = z
  .string()
  .trim()
  .min(1, 'Add the Appwrite project ID to web/.env.local.')
  .max(36, 'Appwrite project IDs are at most 36 characters. Do not paste a server API key here.')
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    'Use the public project ID only (letters, numbers, dots, hyphens, and underscores).',
  )

const optionalResourceIdSchema = z
  .string()
  .trim()
  .max(36, 'Appwrite resource IDs are at most 36 characters.')
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    'Use a public Appwrite resource ID (letters, numbers, dots, hyphens, and underscores), not a placeholder or API key.',
  )

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0
  } catch {
    return false
  }
}

function readRaw(key: PublicEnvKey): string | undefined {
  const value = rawEnvironment[key]
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Vite performs static replacement of `import.meta.env.VITE_*` expressions.
 * Reading them through a dynamic key would drop custom values from production
 * bundles, so every public variable is referenced explicitly here.
 */
const rawEnvironment: Record<PublicEnvKey, string | undefined> = {
  VITE_APPWRITE_ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  VITE_APPWRITE_DATABASE_ID: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  VITE_APPWRITE_RESUMES_BUCKET_ID: import.meta.env.VITE_APPWRITE_RESUMES_BUCKET_ID,
  VITE_APPWRITE_REPORTS_BUCKET_ID: import.meta.env.VITE_APPWRITE_REPORTS_BUCKET_ID,
  VITE_APPWRITE_ANALYZE_FUNCTION_ID: import.meta.env.VITE_APPWRITE_ANALYZE_FUNCTION_ID,
}

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid value.'
}

function readRequired(
  key: PublicEnvKey,
  value: string | undefined,
  schema: z.ZodType<string>,
  issues: EnvironmentIssue[],
): string | null {
  if (!value) {
    issues.push({
      variable: key,
      message: 'Missing. Add this variable to web/.env.local.',
      severity: 'error',
    })
    return null
  }

  const result = schema.safeParse(value)
  if (!result.success) {
    issues.push({ variable: key, message: firstIssueMessage(result.error), severity: 'error' })
    return null
  }

  return result.data
}

function readResource(
  key: PublicEnvKey,
  value: string | undefined,
  issues: EnvironmentIssue[],
  required: boolean,
): string | null {
  if (!value) {
    if (required) {
      issues.push({
        variable: key,
        message: 'Missing. Required for profile, CV, and job storage in Phase 3.',
        severity: 'error',
      })
    }
    return null
  }

  const result = optionalResourceIdSchema.safeParse(value)
  if (!result.success) {
    issues.push({
      variable: key,
      message: firstIssueMessage(result.error),
      severity: required ? 'error' : 'warning',
    })
    return null
  }

  return result.data
}

function buildEnvironment(): AppwriteEnvironment {
  const issues: EnvironmentIssue[] = []

  const endpoint = readRequired(
    ENV_KEYS.endpoint,
    readRaw(ENV_KEYS.endpoint),
    endpointSchema,
    issues,
  )
  const projectId = readRequired(
    ENV_KEYS.projectId,
    readRaw(ENV_KEYS.projectId),
    projectIdSchema,
    issues,
  )

  if (endpoint && !endpoint.endsWith('/v1')) {
    issues.push({
      variable: ENV_KEYS.endpoint,
      message: 'Appwrite Cloud endpoints normally end with /v1. Confirm this value.',
      severity: 'warning',
    })
  }

  const databaseId = readResource(
    ENV_KEYS.databaseId,
    readRaw(ENV_KEYS.databaseId),
    issues,
    true,
  )
  const resumesBucketId = readResource(
    ENV_KEYS.resumesBucketId,
    readRaw(ENV_KEYS.resumesBucketId),
    issues,
    true,
  )

  return {
    endpoint,
    projectId,
    databaseId,
    resumesBucketId,
    reportsBucketId: readResource(
      ENV_KEYS.reportsBucketId,
      readRaw(ENV_KEYS.reportsBucketId),
      issues,
      false,
    ),
    analyzeFunctionId: readResource(
      ENV_KEYS.analyzeFunctionId,
      readRaw(ENV_KEYS.analyzeFunctionId),
      issues,
      false,
    ),
    isConfigured: endpoint !== null && projectId !== null,
    isDataConfigured:
      endpoint !== null && projectId !== null && databaseId !== null && resumesBucketId !== null,
    issues,
  }
}

/**
 * Validated public environment configuration.
 *
 * Validation is intentionally non-throwing: the application must still render
 * a useful diagnostic page when configuration is missing or malformed.
 */
export const environment: AppwriteEnvironment = buildEnvironment()
