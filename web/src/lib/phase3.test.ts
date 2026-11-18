import assert from 'node:assert/strict'
import test from 'node:test'
import { AppwriteException } from 'appwrite'
import { buildOwnerPermissions } from './appwrite-permissions.ts'
import {
  DataAuthorizationError,
  DataConfigurationError,
  getDataErrorMessage,
  isRowConflictError,
  isRowNotFoundError,
} from './data-errors.ts'
import { assertRecordOwnership } from './data-security.ts'
import { emptyJobFormValues, toJobFormValues, toJobInput } from './job-input.ts'
import {
  MAX_RESUME_FILE_BYTES,
  sanitizeOriginalFilename,
  validateResumeFile,
  validateResumeMetadata,
} from './resume-file.ts'
import { MAX_JOB_REQUIREMENTS } from './data-constants.ts'
import { jobFormSchema } from './validation/jobs.ts'
import { profileFormSchema } from './validation/profile.ts'
import { formatFileSize, formatWeight } from '../utils/format.ts'
import type { JobWithRequirements } from '../types/data.ts'

test('owner permissions are scoped to the authenticated user', () => {
  const permissions = buildOwnerPermissions('user-123')

  assert.deepEqual(permissions, [
    'read("user:user-123")',
    'update("user:user-123")',
    'delete("user:user-123")',
  ])
})

test('ownership metadata mismatch is rejected in the browser layer', () => {
  assert.throws(() => assertRecordOwnership('user-b', 'user-a'), DataAuthorizationError)
  assert.doesNotThrow(() => assertRecordOwnership('user-a', 'user-a'))
})

test('resume metadata rejects wrong extension, MIME type, and size', () => {
  assert.deepEqual(validateResumeMetadata({ name: 'cv.txt', type: 'application/pdf', size: 20 }), {
    valid: false,
    message: 'Choose a file with a .pdf extension.',
  })
  assert.equal(
    validateResumeMetadata({ name: 'cv.pdf', type: 'text/plain', size: 20 }).valid,
    false,
  )
  assert.equal(
    validateResumeMetadata({ name: 'cv.pdf', type: 'application/pdf', size: 0 }).valid,
    false,
  )
  assert.equal(
    validateResumeMetadata({
      name: 'cv.pdf',
      type: 'application/pdf',
      size: MAX_RESUME_FILE_BYTES + 1,
    }).valid,
    false,
  )
  assert.equal(
    validateResumeMetadata({ name: 'CV.PDF', type: 'application/pdf', size: 20 }).valid,
    true,
  )
})

test('resume file check requires a PDF signature', async () => {
  const valid = new File(['%PDF-1.7\n1 0 obj\n'], 'cv.pdf', { type: 'application/pdf' })
  const invalid = new File(['not a pdf'], 'cv.pdf', { type: 'application/pdf' })

  assert.equal((await validateResumeFile(valid)).valid, true)
  assert.deepEqual(await validateResumeFile(invalid), {
    valid: false,
    message: 'This file does not contain a valid PDF signature.',
  })
})

test('stored original filenames are reduced to safe display metadata', () => {
  assert.equal(sanitizeOriginalFilename('../../hidden/cv.pdf'), 'cv.pdf')
  assert.equal(sanitizeOriginalFilename('C:\\Users\\me\\resume 2026.PDF'), 'resume 2026.PDF')
  assert.equal(sanitizeOriginalFilename('line\nbreak.pdf'), 'linebreak.pdf')
  assert.equal(sanitizeOriginalFilename(''), 'resume.pdf')

  const longUnicodeName = sanitizeOriginalFilename(`${'a'.repeat(254)}📄.pdf`)
  assert.equal(Array.from(longUnicodeName).length, 255)
  assert.equal(longUnicodeName.endsWith('📄'), true)
})

test('file sizes are formatted for the CV list', () => {
  assert.equal(formatFileSize(0), '0 B')
  assert.equal(formatFileSize(512), '512 B')
  assert.equal(formatFileSize(1_536), '1.5 KB')
  assert.equal(formatFileSize(2 * 1_024 * 1_024), '2.0 MB')
})

test('requirement weights are formatted without losing valid precision', () => {
  assert.equal(formatWeight(1), '1')
  assert.equal(formatWeight(1.25), '1.25')
  assert.equal(formatWeight(2.5), '2.5')
  assert.equal(formatWeight(Number.NaN), '—')
})

test('profile display names are trimmed and validated', () => {
  const parsed = profileFormSchema.parse({ displayName: '  Ada Lovelace  ' })
  assert.equal(parsed.displayName, 'Ada Lovelace')
  assert.equal(profileFormSchema.safeParse({ displayName: '   ' }).success, false)
  assert.equal(profileFormSchema.safeParse({ displayName: 'A'.repeat(129) }).success, false)
})

test('job form accepts valid requirements and normalizes text', () => {
  const parsed = jobFormSchema.parse({
    title: '  Senior Engineer  ',
    companyName: '  Acme  ',
    description: '  Build reliable software.  ',
    responsibilities: '  Mentor engineers.  ',
    requirements: [
      {
        category: 'required_skill',
        description: '  React experience  ',
        importance: 'required',
        weight: 2.5,
      },
    ],
  })

  assert.equal(parsed.title, 'Senior Engineer')
  assert.equal(parsed.companyName, 'Acme')
  assert.equal(parsed.requirements[0]?.description, 'React experience')
  assert.equal(parsed.requirements[0]?.weight, 2.5)
})

test('job form rejects invalid weights and duplicate requirement IDs', () => {
  const base = {
    ...emptyJobFormValues,
    title: 'Engineer',
    description: 'Description',
  }

  assert.equal(
    jobFormSchema.safeParse({
      ...base,
      requirements: [
        {
          category: 'other',
          description: 'Requirement',
          importance: 'required',
          weight: 0,
        },
      ],
    }).success,
    false,
  )

  const missingWeight = jobFormSchema.safeParse({
    ...base,
    requirements: [
      {
        category: 'other',
        description: 'Requirement',
        importance: 'required',
        weight: Number.NaN,
      },
    ],
  })

  assert.equal(missingWeight.success, false)
  assert.equal(
    missingWeight.success ? '' : missingWeight.error.issues[0]?.message,
    'Enter a numeric weight.',
  )

  const duplicate = jobFormSchema.safeParse({
    ...base,
    requirements: [
      {
        id: 'requirement-1',
        category: 'other',
        description: 'Requirement one',
        importance: 'required',
        weight: 1,
      },
      {
        id: 'requirement-1',
        category: 'other',
        description: 'Requirement two',
        importance: 'preferred',
        weight: 1,
      },
    ],
  })

  assert.equal(duplicate.success, false)
  assert.equal(
    duplicate.success
      ? false
      : duplicate.error.issues.some((issue) => issue.path.join('.') === 'requirements.1.id'),
    true,
  )
})

test('job form enforces the transaction-safe requirement limit', () => {
  const requirement = {
    category: 'other' as const,
    description: 'Requirement',
    importance: 'required' as const,
    weight: 1,
  }
  const base = {
    title: 'Engineer',
    companyName: '',
    description: 'Description',
    responsibilities: '',
  }

  assert.equal(
    jobFormSchema.safeParse({
      ...base,
      requirements: Array.from({ length: MAX_JOB_REQUIREMENTS }, () => ({ ...requirement })),
    }).success,
    true,
  )
  assert.equal(
    jobFormSchema.safeParse({
      ...base,
      requirements: Array.from({ length: MAX_JOB_REQUIREMENTS + 1 }, () => ({ ...requirement })),
    }).success,
    false,
  )
})

test('job form and service input conversions preserve requirement IDs', () => {
  const job: JobWithRequirements = {
    id: 'job-1',
    userId: 'user-1',
    title: 'Engineer',
    companyName: null,
    description: 'Description',
    responsibilities: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    requirements: [
      {
        id: 'requirement-1',
        jobId: 'job-1',
        category: 'required_skill',
        description: 'TypeScript',
        importance: 'required',
        weight: 1.5,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }

  const formValues = toJobFormValues(job)
  assert.equal(formValues.companyName, '')
  assert.equal(formValues.requirements[0]?.id, 'requirement-1')

  const input = toJobInput({
    ...formValues,
    requirements: [
      ...formValues.requirements,
      {
        category: 'other',
        description: 'New requirement',
        importance: 'preferred',
        weight: 1,
      },
    ],
  })

  assert.equal(input.requirements[0]?.id, 'requirement-1')
  assert.equal(input.requirements[1]?.id, undefined)
})

test('data errors never expose raw Appwrite messages', () => {
  assert.equal(
    getDataErrorMessage(new AppwriteException('raw SQL/internal detail', 404, 'row_not_found')),
    'That record could not be found. It may have been deleted.',
  )
  assert.equal(
    getDataErrorMessage(new AppwriteException('raw detail', 401, 'user_unauthorized')),
    'You do not have access to that record, or your session has expired. Sign in again if needed.',
  )
  assert.equal(
    getDataErrorMessage(new DataAuthorizationError()),
    'You do not have access to that record.',
  )
  assert.match(
    getDataErrorMessage(new DataConfigurationError()),
    /not configured|missing/i,
  )
  assert.doesNotMatch(
    getDataErrorMessage(new AppwriteException('secret internals', 500, 'general_error')),
    /secret internals/,
  )
})

test('Appwrite row error helpers distinguish missing and duplicate rows', () => {
  assert.equal(isRowNotFoundError(new AppwriteException('raw', 404, 'row_not_found')), true)
  assert.equal(isRowNotFoundError(new AppwriteException('raw', 404, 'table_not_found')), false)
  assert.equal(isRowConflictError(new AppwriteException('raw', 409, 'row_already_exists')), true)
  assert.equal(isRowConflictError(new AppwriteException('raw', 500, 'general_error')), false)
})
