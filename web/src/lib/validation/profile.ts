import { z } from 'zod'

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a display name.')
  .max(128, 'Display names must be 128 characters or fewer.')

export const profileFormSchema = z.object({
  displayName: displayNameSchema,
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>
