import { AppwriteException } from 'appwrite'

/**
 * Data-layer errors with messages that are safe to show in the UI. Raw
 * Appwrite responses and stack traces are never forwarded to components.
 */
export class DataConfigurationError extends Error {
  constructor(
    message = 'CV and job storage is not configured yet. Open the system check for setup steps.',
  ) {
    super(message)
    this.name = 'DataConfigurationError'
  }
}

export class DataAuthorizationError extends Error {
  constructor(message = 'You do not have access to that record.') {
    super(message)
    this.name = 'DataAuthorizationError'
  }
}

export class DataNotFoundError extends Error {
  constructor(message = 'That record could not be found. It may have been deleted.') {
    super(message)
    this.name = 'DataNotFoundError'
  }
}

export class DataValidationError extends Error {
  constructor(message = 'Some of the submitted details are not valid. Check the form and try again.') {
    super(message)
    this.name = 'DataValidationError'
  }
}

export class ResumeUploadError extends Error {
  constructor(
    message = 'The CV could not be uploaded. The private file upload or its record could not be completed.',
  ) {
    super(message)
    this.name = 'ResumeUploadError'
  }
}

export class ResumeDeleteIncompleteError extends Error {
  constructor() {
    super(
      'The private CV file was deleted, but its library record could not be removed. Retry the deletion to finish cleanup.',
    )
    this.name = 'ResumeDeleteIncompleteError'
  }
}

const ROW_NOT_FOUND_TYPES = new Set(['row_not_found', 'document_not_found'])
const ROW_CONFLICT_TYPES = new Set(['row_already_exists', 'document_already_exists'])

export function isRowNotFoundError(error: unknown): boolean {
  return (
    error instanceof AppwriteException &&
    (ROW_NOT_FOUND_TYPES.has(error.type) || (error.code === 404 && error.type === ''))
  )
}

export function isRowConflictError(error: unknown): boolean {
  return (
    error instanceof AppwriteException &&
    (ROW_CONFLICT_TYPES.has(error.type) || error.code === 409)
  )
}

export function isFileNotFoundError(error: unknown): boolean {
  return error instanceof AppwriteException && error.type === 'storage_file_not_found'
}

const friendlyMessagesByType: Record<string, string> = {
  row_not_found: 'That record could not be found. It may have been deleted.',
  document_not_found: 'That record could not be found. It may have been deleted.',
  row_already_exists: 'That record already exists.',
  document_already_exists: 'That record already exists.',
  row_invalid: 'Some of the submitted details are not valid. Check the form and try again.',
  document_invalid: 'Some of the submitted details are not valid. Check the form and try again.',
  database_not_found:
    'The configured Appwrite database was not found. Review the Phase 3 setup guide.',
  table_not_found:
    'A required Appwrite table was not found. Create the Phase 3 tables before using this page.',
  collection_not_found:
    'A required Appwrite table was not found. Create the Phase 3 tables before using this page.',
  storage_bucket_not_found:
    'The configured CV storage bucket was not found. Review the Phase 3 setup guide.',
  storage_file_not_found: 'The private CV file was not found. It may already have been deleted.',
  storage_file_type_unsupported: 'Only PDF files are accepted.',
  storage_invalid_file_type: 'Only PDF files are accepted.',
  storage_invalid_file_extension: 'Only files with a .pdf extension are accepted.',
  storage_invalid_file_size: 'The selected file is larger than the configured limit.',
  storage_file_size_exceeded: 'The selected file is larger than the configured limit.',
  storage_invalid_file: 'That file could not be accepted. Choose a valid PDF.',
  user_unauthorized:
    'You do not have access to that record, or your session has expired. Sign in again if needed.',
  user_session_not_found: 'Your session has expired. Please sign in again.',
  general_access_forbidden: 'You do not have permission to complete that request.',
  general_unauthorized_scope: 'You do not have permission to complete that request.',
  general_rate_limit_exceeded: 'Too many requests. Wait a moment and try again.',
}

/**
 * Convert Appwrite/network/storage failures into a single friendly message.
 * This function never returns the raw provider message.
 */
export function getDataErrorMessage(error: unknown): string {
  if (
    error instanceof DataConfigurationError ||
    error instanceof DataAuthorizationError ||
    error instanceof DataNotFoundError ||
    error instanceof DataValidationError ||
    error instanceof ResumeUploadError ||
    error instanceof ResumeDeleteIncompleteError
  ) {
    return error.message
  }

  if (error instanceof AppwriteException) {
    const typeMessage = friendlyMessagesByType[error.type]
    if (typeMessage) {
      return typeMessage
    }

    if (error.code === 401) {
      return 'You do not have access to that record, or your session has expired. Sign in again if needed.'
    }

    if (error.code === 403) {
      return 'You do not have permission to access that record.'
    }

    if (error.code === 404) {
      return 'That record could not be found. It may have been deleted.'
    }

    if (error.code === 409) {
      return 'That record was changed elsewhere. Refresh the page and try again.'
    }

    if (error.code === 413) {
      return 'The selected file is larger than the configured limit.'
    }

    if (error.code === 429) {
      return 'Too many requests. Wait a moment and try again.'
    }

    if (error.code >= 500) {
      return 'The data service is temporarily unavailable. Please try again shortly.'
    }

    return 'We could not complete that request. Please try again.'
  }

  if (error instanceof TypeError) {
    return 'Unable to reach the data service. Check your connection and Appwrite configuration.'
  }

  return 'Something went wrong while completing that request. Please try again.'
}
