import { ID, Query, Storage, TablesDB, type Models } from 'appwrite'
import { appwriteClient } from '../lib/appwrite'
import { buildOwnerPermissions } from '../lib/appwrite-permissions'
import { DATA_LIST_LIMIT } from '../lib/data-constants'
import { TABLE_IDS, requireDatabaseId, requireResumesBucketId } from '../lib/data-config'
import {
  DataConfigurationError,
  DataNotFoundError,
  DataValidationError,
  ResumeDeleteIncompleteError,
  ResumeUploadError,
  isFileNotFoundError,
  isRowNotFoundError,
} from '../lib/data-errors'
import { assertRecordOwnership } from '../lib/data-security'
import {
  RESUME_ALLOWED_MIME_TYPE,
  sanitizeOriginalFilename,
  validateResumeFile,
} from '../lib/resume-file'
import { resumeRowSchema, type ResumeRowData } from '../lib/validation/data'
import type { Resume } from '../types/data'

type ResumeRow = Models.Row & ResumeRowData

const tablesDB = appwriteClient ? new TablesDB(appwriteClient) : null
const storage = appwriteClient ? new Storage(appwriteClient) : null

function requireTablesDB(): TablesDB {
  requireDatabaseId()
  if (!tablesDB) {
    throw new DataConfigurationError()
  }

  return tablesDB
}

function requireStorage(): Storage {
  requireResumesBucketId()
  if (!storage) {
    throw new DataConfigurationError()
  }

  return storage
}

function parseResumeRow(row: ResumeRow, currentUserId: string): Resume {
  const parsed = resumeRowSchema.safeParse(row)

  if (!parsed.success) {
    throw new DataValidationError('The CV data returned by Appwrite was not in the expected format.')
  }

  assertRecordOwnership(parsed.data.user_id, currentUserId)

  return {
    id: parsed.data.$id,
    userId: parsed.data.user_id,
    originalFilename: parsed.data.original_filename,
    storageFileId: parsed.data.storage_file_id,
    fileSize: parsed.data.file_size,
    mimeType: parsed.data.mime_type,
    pageCount: parsed.data.page_count ?? null,
    extractionStatus: parsed.data.extraction_status,
    createdAt: parsed.data.$createdAt,
    updatedAt: parsed.data.$updatedAt,
  }
}

async function readResumeRow(resumeId: string): Promise<ResumeRow> {
  const tables = requireTablesDB()

  try {
    return await tables.getRow<ResumeRow>({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.resumes,
      rowId: resumeId,
    })
  } catch (error) {
    if (isRowNotFoundError(error)) {
      throw new DataNotFoundError()
    }

    throw error
  }
}

export async function listResumes(userId: string): Promise<Resume[]> {
  const tables = requireTablesDB()

  const result = await tables.listRows<ResumeRow>({
    databaseId: requireDatabaseId(),
    tableId: TABLE_IDS.resumes,
    queries: [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(DATA_LIST_LIMIT),
    ],
  })

  return result.rows.map((row) => parseResumeRow(row, userId))
}

export async function getResume(userId: string, resumeId: string): Promise<Resume> {
  const row = await readResumeRow(resumeId)
  return parseResumeRow(row, userId)
}

export interface ResumeUploadOptions {
  onProgress?: (percentage: number) => void
}

/**
 * Upload a PDF to the private resumes bucket, then persist its metadata row.
 * If metadata persistence fails, a best-effort cleanup removes the generated
 * row and file so a failed upload does not normally leave partial state.
 */
export async function uploadResume(
  userId: string,
  file: File,
  options: ResumeUploadOptions = {},
): Promise<Resume> {
  const validation = await validateResumeFile(file)
  if (!validation.valid) {
    throw new DataValidationError(validation.message)
  }

  const tables = requireTablesDB()
  const fileStorage = requireStorage()
  const bucketId = requireResumesBucketId()
  const storageFileId = ID.unique()
  const resumeRowId = ID.unique()
  const generatedFile = new File([file], `${storageFileId}.pdf`, {
    type: RESUME_ALLOWED_MIME_TYPE,
  })

  const uploadedFile = await fileStorage.createFile({
    bucketId,
    fileId: storageFileId,
    file: generatedFile,
    permissions: buildOwnerPermissions(userId),
    onProgress: (event) => {
      options.onProgress?.(Math.max(0, Math.min(100, Math.round(event.progress))))
    },
  })

  try {
    const row = await tables.createRow<ResumeRow>({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.resumes,
      rowId: resumeRowId,
      data: {
        user_id: userId,
        original_filename: sanitizeOriginalFilename(file.name),
        storage_file_id: uploadedFile.$id,
        file_size: uploadedFile.sizeOriginal,
        mime_type: uploadedFile.mimeType || RESUME_ALLOWED_MIME_TYPE,
        extraction_status: 'pending',
      },
      permissions: buildOwnerPermissions(userId),
    })

    return parseResumeRow(row, userId)
  } catch {
    // The metadata request may have committed even if its response was lost.
    // Attempt to remove the generated row as well as the file so a retry does
    // not leave a visible row pointing at bytes that cleanup removed.
    try {
      await tables.deleteRow({
        databaseId: requireDatabaseId(),
        tableId: TABLE_IDS.resumes,
        rowId: resumeRowId,
      })
    } catch {
      // Best effort only. A missing row is expected when createRow never
      // committed.
    }

    try {
      await fileStorage.deleteFile({ bucketId, fileId: uploadedFile.$id })
    } catch {
      // The cleanup is best-effort. The safe UI message below does not expose
      // provider details or claim that cleanup succeeded.
    }

    throw new ResumeUploadError()
  }
}

/**
 * Delete the private file before its metadata row. If file deletion fails, the
 * row remains so the user can retry rather than losing the file reference.
 */
export async function deleteResume(userId: string, resumeId: string): Promise<void> {
  const row = await readResumeRow(resumeId)
  const resume = parseResumeRow(row, userId)
  const tables = requireTablesDB()
  const fileStorage = requireStorage()
  const bucketId = requireResumesBucketId()

  try {
    await fileStorage.deleteFile({ bucketId, fileId: resume.storageFileId })
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error
    }
  }

  try {
    await tables.deleteRow({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.resumes,
      rowId: resume.id,
    })
  } catch (error) {
    if (isRowNotFoundError(error)) {
      return
    }

    throw new ResumeDeleteIncompleteError()
  }
}
