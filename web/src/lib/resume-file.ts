/**
 * Phase 3 accepts PDF files only. File metadata and the PDF signature are
 * checked here before the private upload starts. Text extraction, encryption
 * detection, and page counting belong to Phase 4 and are not claimed here.
 */
export const MAX_RESUME_FILE_BYTES = 10 * 1024 * 1024
export const MAX_RESUME_PAGE_COUNT = 20
export const RESUME_ALLOWED_EXTENSION = '.pdf'
export const RESUME_ALLOWED_MIME_TYPE = 'application/pdf'

export interface ResumeFileValidationSuccess {
  valid: true
}

export interface ResumeFileValidationFailure {
  valid: false
  message: string
}

export type ResumeFileValidationResult =
  | ResumeFileValidationSuccess
  | ResumeFileValidationFailure

function failure(message: string): ResumeFileValidationFailure {
  return { valid: false, message }
}

/**
 * Remove path separators and control characters from the stored display name.
 * This value is metadata only; the Storage file ID and filename are generated
 * by the application and never derived from user input.
 */
export function sanitizeOriginalFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? ''
  const cleaned = Array.from(basename)
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join('')
    .trim()

  return Array.from(cleaned).slice(0, 255).join('') || 'resume.pdf'
}

export function validateResumeMetadata(
  file: Pick<File, 'name' | 'type' | 'size'>,
): ResumeFileValidationResult {
  if (!file.name.toLowerCase().endsWith(RESUME_ALLOWED_EXTENSION)) {
    return failure('Choose a file with a .pdf extension.')
  }

  if (file.type.trim().toLowerCase() !== RESUME_ALLOWED_MIME_TYPE) {
    return failure('The browser did not identify this file as an application/pdf document.')
  }

  if (file.size <= 0) {
    return failure('The selected file is empty.')
  }

  if (file.size > MAX_RESUME_FILE_BYTES) {
    return failure('The selected PDF is larger than the 10 MB limit.')
  }

  return { valid: true }
}

/**
 * Validate extension, MIME type, size, and the PDF signature/content header.
 * Never trust the filename alone.
 */
export async function validateResumeFile(file: File): Promise<ResumeFileValidationResult> {
  if (!(file instanceof File)) {
    return failure('Choose a PDF file to upload.')
  }

  const metadataResult = validateResumeMetadata(file)
  if (!metadataResult.valid) {
    return metadataResult
  }

  try {
    const headerBytes = new Uint8Array(await file.slice(0, 1_024).arrayBuffer())
    const header = new TextDecoder('latin1').decode(headerBytes)

    if (!header.includes('%PDF-')) {
      return failure('This file does not contain a valid PDF signature.')
    }
  } catch {
    return failure('The selected file could not be read. Choose a different PDF.')
  }

  return { valid: true }
}
