import { z } from 'zod'
import {
  JOB_REQUIREMENT_CATEGORIES,
  JOB_REQUIREMENT_IMPORTANCE_LEVELS,
  MAX_JOB_REQUIREMENTS,
} from '../data-constants.ts'

export const jobRequirementFormSchema = z.object({
  id: z.string().trim().max(36).optional(),
  category: z.enum(JOB_REQUIREMENT_CATEGORIES),
  description: z
    .string()
    .trim()
    .min(1, 'Describe this requirement.')
    .max(2_000, 'Requirement descriptions must be 2,000 characters or fewer.'),
  importance: z.enum(JOB_REQUIREMENT_IMPORTANCE_LEVELS),
  weight: z
    .number({ error: 'Enter a numeric weight.' })
    .min(0.1, 'Weight must be at least 0.1.')
    .max(10, 'Weight must be 10 or less.'),
})

export const jobFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Enter the job title.')
      .max(200, 'Job titles must be 200 characters or fewer.'),
    companyName: z.string().trim().max(200, 'Company names must be 200 characters or fewer.'),
    description: z
      .string()
      .trim()
      .min(1, 'Paste or enter the job description.')
      .max(30_000, 'Job descriptions must be 30,000 characters or fewer.'),
    responsibilities: z
      .string()
      .trim()
      .max(20_000, 'Responsibilities must be 20,000 characters or fewer.'),
    requirements: z
      .array(jobRequirementFormSchema)
      .max(MAX_JOB_REQUIREMENTS, `Add at most ${MAX_JOB_REQUIREMENTS} requirements.`),
  })
  .superRefine((values, context) => {
    const seen = new Set<string>()

    values.requirements.forEach((requirement, index) => {
      if (!requirement.id) {
        return
      }

      if (seen.has(requirement.id)) {
        context.addIssue({
          code: 'custom',
          message: 'The same requirement was included more than once.',
          path: ['requirements', index, 'id'],
        })
        return
      }

      seen.add(requirement.id)
    })
  })

export type JobFormValues = z.infer<typeof jobFormSchema>
export type JobRequirementFormValues = z.infer<typeof jobRequirementFormSchema>
