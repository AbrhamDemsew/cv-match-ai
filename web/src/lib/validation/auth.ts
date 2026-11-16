import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(254, 'Email addresses must be 254 characters or fewer.')
  .email('Enter a valid email address.')

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(256, 'Password must be 256 characters or fewer.')

// Existing Appwrite accounts may predate the current password policy. Login
// only requires a non-empty value; the server remains authoritative.
const currentPasswordSchema = z
  .string()
  .min(1, 'Enter your password.')
  .max(256, 'Password must be 256 characters or fewer.')

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name.')
  .max(128, 'Name must be 128 characters or fewer.')

export const loginSchema = z.object({
  email: emailSchema,
  password: currentPasswordSchema,
})

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
