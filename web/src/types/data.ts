import type {
  JobRequirementCategory,
  JobRequirementImportance,
  ResumeExtractionStatus,
} from '../lib/data-constants'

/**
 * Narrow domain types consumed by the UI. Appwrite row shapes stay inside the
 * service modules.
 */
export interface UserProfile {
  id: string
  displayName: string
  createdAt: string
  updatedAt: string
}

export interface Resume {
  id: string
  userId: string
  originalFilename: string
  storageFileId: string
  fileSize: number
  mimeType: string
  pageCount: number | null
  extractionStatus: ResumeExtractionStatus
  createdAt: string
  updatedAt: string
}

export interface Job {
  id: string
  userId: string
  title: string
  companyName: string | null
  description: string
  responsibilities: string | null
  createdAt: string
  updatedAt: string
}

export interface JobRequirement {
  id: string
  jobId: string
  category: JobRequirementCategory
  description: string
  importance: JobRequirementImportance
  weight: number
  createdAt: string
  updatedAt: string
}

export interface JobWithRequirements extends Job {
  requirements: JobRequirement[]
}

export interface JobRequirementInput {
  /** Present only when editing an existing requirement. */
  id?: string
  category: JobRequirementCategory
  description: string
  importance: JobRequirementImportance
  weight: number
}

export interface JobInput {
  title: string
  companyName: string
  description: string
  responsibilities: string
  requirements: JobRequirementInput[]
}
