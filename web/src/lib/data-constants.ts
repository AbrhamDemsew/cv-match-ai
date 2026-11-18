export const RESUME_EXTRACTION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const

export type ResumeExtractionStatus = (typeof RESUME_EXTRACTION_STATUSES)[number]

export const JOB_REQUIREMENT_CATEGORIES = [
  'required_skill',
  'preferred_skill',
  'experience',
  'education',
  'responsibility',
  'other',
] as const

export type JobRequirementCategory = (typeof JOB_REQUIREMENT_CATEGORIES)[number]

export const JOB_REQUIREMENT_IMPORTANCE_LEVELS = ['required', 'preferred'] as const

export type JobRequirementImportance = (typeof JOB_REQUIREMENT_IMPORTANCE_LEVELS)[number]

export const JOB_REQUIREMENT_CATEGORY_LABELS: Record<JobRequirementCategory, string> = {
  required_skill: 'Required skill',
  preferred_skill: 'Preferred skill',
  experience: 'Experience',
  education: 'Education',
  responsibility: 'Responsibility',
  other: 'Other',
}

export const JOB_REQUIREMENT_IMPORTANCE_LABELS: Record<JobRequirementImportance, string> = {
  required: 'Required',
  preferred: 'Preferred',
}

export const RESUME_EXTRACTION_STATUS_LABELS: Record<ResumeExtractionStatus, string> = {
  pending: 'Awaiting extraction',
  processing: 'Processing',
  completed: 'Extracted',
  failed: 'Extraction failed',
}

/**
 * Keep the requirement cap below Appwrite's smallest transaction limit. On the
 * Free plan a transaction can stage 100 operations. Replacing a full job can
 * stage the job update, up to 45 requirement creates, and up to 45 deletes
 * (91 operations total), leaving headroom for the client to commit safely.
 */
export const MAX_JOB_REQUIREMENTS = 45
export const DATA_LIST_LIMIT = 100
