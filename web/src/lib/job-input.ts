import type { JobFormValues, JobRequirementFormValues } from './validation/jobs.ts'
import type { JobInput, JobWithRequirements } from '../types/data.ts'

export const emptyJobFormValues: JobFormValues = {
  title: '',
  companyName: '',
  description: '',
  responsibilities: '',
  requirements: [],
}

function toRequirement(requirement: JobRequirementFormValues) {
  return {
    ...(requirement.id ? { id: requirement.id } : {}),
    category: requirement.category,
    description: requirement.description,
    importance: requirement.importance,
    weight: requirement.weight,
  }
}

export function toJobInput(values: JobFormValues): JobInput {
  return {
    title: values.title,
    companyName: values.companyName,
    description: values.description,
    responsibilities: values.responsibilities,
    requirements: values.requirements.map(toRequirement),
  }
}

export function toJobFormValues(job: JobWithRequirements): JobFormValues {
  return {
    title: job.title,
    companyName: job.companyName ?? '',
    description: job.description,
    responsibilities: job.responsibilities ?? '',
    requirements: job.requirements.map((requirement) => ({
      id: requirement.id,
      category: requirement.category,
      description: requirement.description,
      importance: requirement.importance,
      weight: requirement.weight,
    })),
  }
}
