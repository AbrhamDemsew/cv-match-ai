import { z } from 'zod'
import {
  JOB_REQUIREMENT_CATEGORIES,
  JOB_REQUIREMENT_IMPORTANCE_LEVELS,
  RESUME_EXTRACTION_STATUSES,
} from '../data-constants'

const idSchema = z.string().trim().min(1).max(36)
const timestampSchema = z.string().min(1)
const nullishText = (max: number) => z.string().max(max).nullish()

const systemRowShape = {
  $id: idSchema,
  $createdAt: timestampSchema,
  $updatedAt: timestampSchema,
}

export const profileRowSchema = z.object({
  ...systemRowShape,
  display_name: z.string().trim().min(1).max(128),
})

export const resumeRowSchema = z.object({
  ...systemRowShape,
  user_id: idSchema,
  original_filename: z.string().min(1).max(255),
  storage_file_id: idSchema,
  file_size: z.number().int().min(1),
  mime_type: z.string().min(1).max(100),
  page_count: z.number().int().min(1).nullish(),
  extraction_status: z.enum(RESUME_EXTRACTION_STATUSES),
})

export const jobRowSchema = z.object({
  ...systemRowShape,
  user_id: idSchema,
  title: z.string().trim().min(1).max(200),
  company_name: nullishText(200),
  description: z.string().min(1).max(30_000),
  responsibilities: nullishText(20_000),
})

export const jobRequirementRowSchema = z.object({
  ...systemRowShape,
  job_id: idSchema,
  category: z.enum(JOB_REQUIREMENT_CATEGORIES),
  description: z.string().trim().min(1).max(2_000),
  importance: z.enum(JOB_REQUIREMENT_IMPORTANCE_LEVELS),
  weight: z.number().min(0.1).max(10),
})

export type ProfileRowData = z.infer<typeof profileRowSchema>
export type ResumeRowData = z.infer<typeof resumeRowSchema>
export type JobRowData = z.infer<typeof jobRowSchema>
export type JobRequirementRowData = z.infer<typeof jobRequirementRowSchema>
