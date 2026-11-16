import assert from 'node:assert/strict'
import test from 'node:test'
import { AppwriteException } from 'appwrite'
import {
  AuthConfigurationError,
  getAuthErrorMessage,
  isMissingSessionError,
} from './auth-errors.ts'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './validation/auth.ts'
import { getSafeRedirectPath } from '../utils/redirect.ts'
import { getInitials } from '../utils/user.ts'

test('maps invalid credentials to a safe message', () => {
  const error = new AppwriteException('raw details', 401, 'user_invalid_credentials')
  assert.equal(
    getAuthErrorMessage(error),
    'The email or password you entered is incorrect. Please try again.',
  )
})

test('maps duplicate email registration', () => {
  const error = new AppwriteException('raw details', 409, 'user_email_already_exists')
  assert.match(getAuthErrorMessage(error), /already exists/)
})

test('maps rate limiting by error code when the type is unknown', () => {
  const error = new AppwriteException('raw details', 429, 'general_mock')
  assert.match(getAuthErrorMessage(error), /Too many attempts/)
})

test('does not expose raw Appwrite messages or configuration errors internally', () => {
  const error = new AppwriteException('secret internal details', 500, 'general_server_error')
  const message = getAuthErrorMessage(error)
  assert.doesNotMatch(message, /secret internal details/)
  assert.match(message, /temporarily unavailable/)
})

test('maps configuration failures to setup guidance', () => {
  assert.match(getAuthErrorMessage(new AuthConfigurationError()), /system check/)
})

test('treats missing and expired sessions as signed out', () => {
  assert.equal(isMissingSessionError(new AppwriteException('missing', 401, 'user_unauthorized')), true)
  assert.equal(
    isMissingSessionError(new AppwriteException('missing', 404, 'user_session_not_found')),
    true,
  )
  assert.equal(
    isMissingSessionError(new AppwriteException('missing', 404, 'project_not_found')),
    false,
  )
})

test('only permits safe internal post-login redirects', () => {
  assert.equal(getSafeRedirectPath('/dashboard'), '/dashboard')
  assert.equal(getSafeRedirectPath('/jobs?view=recent#top'), '/jobs?view=recent#top')
  assert.equal(getSafeRedirectPath(undefined), '/dashboard')
  assert.equal(getSafeRedirectPath('https://evil.example'), '/dashboard')
  assert.equal(getSafeRedirectPath('//evil.example'), '/dashboard')
  assert.equal(getSafeRedirectPath('/\\evil.example'), '/dashboard')
  assert.equal(getSafeRedirectPath('/login'), '/dashboard')
  assert.equal(getSafeRedirectPath('/register?next=/dashboard'), '/dashboard')
})

test('derives initials for the account avatar', () => {
  assert.equal(getInitials('Alex Morgan', 'alex@example.com'), 'AM')
  assert.equal(getInitials('', 'alex@example.com'), 'AL')
  assert.equal(getInitials(null, null), 'U')
})

test('validates registration fields including password confirmation', () => {
  const result = registerSchema.safeParse({
    name: '',
    email: 'not-an-email',
    password: 'short',
  })

  assert.equal(result.success, false)
  if (!result.success) {
    const fields = new Set(result.error.issues.map((issue) => issue.path[0]))
    assert.equal(fields.has('name'), true)
    assert.equal(fields.has('email'), true)
    assert.equal(fields.has('password'), true)
    assert.equal(fields.has('confirmPassword'), true)
  }
})

test('requires registration passwords to match', () => {
  const valid = registerSchema.safeParse({
    name: 'Alex Morgan',
    email: 'alex@example.com',
    password: 'a-strong-password',
    confirmPassword: 'a-strong-password',
  })

  assert.equal(valid.success, true)

  const mismatch = registerSchema.safeParse({
    name: 'Alex Morgan',
    email: 'alex@example.com',
    password: 'a-strong-password',
    confirmPassword: 'a-different-password',
  })

  assert.equal(mismatch.success, false)
  if (!mismatch.success) {
    assert.equal(
      mismatch.error.issues.some(
        (issue) =>
          issue.path[0] === 'confirmPassword' && issue.message === 'Passwords do not match.',
      ),
      true,
    )
  }
})

test('accepts a valid login without blocking older shorter passwords', () => {
  assert.equal(
    loginSchema.safeParse({ email: 'alex@example.com', password: 'a-strong-password' }).success,
    true,
  )
  // The server remains authoritative for existing accounts created under older policies.
  assert.equal(loginSchema.safeParse({ email: 'alex@example.com', password: 'short' }).success, true)
  assert.equal(loginSchema.safeParse({ email: 'alex@example.com', password: '' }).success, false)
})

test('validates recovery email and matching reset passwords', () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: 'alex@example.com' }).success, true)
  assert.equal(forgotPasswordSchema.safeParse({ email: 'bad' }).success, false)

  assert.equal(
    resetPasswordSchema.safeParse({
      password: 'a-strong-password',
      confirmPassword: 'a-strong-password',
    }).success,
    true,
  )

  assert.equal(
    resetPasswordSchema.safeParse({
      password: 'a-strong-password',
      confirmPassword: 'different-password',
    }).success,
    false,
  )
})
