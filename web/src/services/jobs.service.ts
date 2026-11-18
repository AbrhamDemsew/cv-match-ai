import { ID, Query, TablesDB, type Models } from 'appwrite'
import { appwriteClient } from '../lib/appwrite'
import { buildOwnerPermissions } from '../lib/appwrite-permissions'
import { DATA_LIST_LIMIT } from '../lib/data-constants'
import { TABLE_IDS, requireDatabaseId } from '../lib/data-config'
import {
  DataAuthorizationError,
  DataConfigurationError,
  DataNotFoundError,
  DataValidationError,
  isRowNotFoundError,
} from '../lib/data-errors'
import { assertRecordOwnership } from '../lib/data-security'
import {
  jobFormSchema,
  type JobFormValues,
  type JobRequirementFormValues,
} from '../lib/validation/jobs'
import {
  jobRequirementRowSchema,
  jobRowSchema,
  type JobRequirementRowData,
  type JobRowData,
} from '../lib/validation/data'
import type { Job, JobInput, JobRequirement, JobWithRequirements } from '../types/data'

type JobRow = Models.Row & JobRowData
type JobRequirementRow = Models.Row & JobRequirementRowData

const tablesDB = appwriteClient ? new TablesDB(appwriteClient) : null

function requireTablesDB(): TablesDB {
  requireDatabaseId()
  if (!tablesDB) {
    throw new DataConfigurationError()
  }

  return tablesDB
}

function parseJobRow(row: JobRow, currentUserId: string): Job {
  const parsed = jobRowSchema.safeParse(row)

  if (!parsed.success) {
    throw new DataValidationError('The job data returned by Appwrite was not in the expected format.')
  }

  assertRecordOwnership(parsed.data.user_id, currentUserId)

  return {
    id: parsed.data.$id,
    userId: parsed.data.user_id,
    title: parsed.data.title,
    companyName: parsed.data.company_name ?? null,
    description: parsed.data.description,
    responsibilities: parsed.data.responsibilities ?? null,
    createdAt: parsed.data.$createdAt,
    updatedAt: parsed.data.$updatedAt,
  }
}

function parseRequirementRow(row: JobRequirementRow, expectedJobId: string): JobRequirement {
  const parsed = jobRequirementRowSchema.safeParse(row)

  if (!parsed.success) {
    throw new DataValidationError(
      'The job requirement data returned by Appwrite was not in the expected format.',
    )
  }

  if (parsed.data.job_id !== expectedJobId) {
    throw new DataAuthorizationError()
  }

  return {
    id: parsed.data.$id,
    jobId: parsed.data.job_id,
    category: parsed.data.category,
    description: parsed.data.description,
    importance: parsed.data.importance,
    weight: parsed.data.weight,
    createdAt: parsed.data.$createdAt,
    updatedAt: parsed.data.$updatedAt,
  }
}

function parseJobInput(input: JobInput): JobFormValues {
  const parsed = jobFormSchema.safeParse(input)

  if (!parsed.success) {
    throw new DataValidationError(
      parsed.error.issues[0]?.message ?? 'Check the job details and try again.',
    )
  }

  return parsed.data
}

function jobData(values: JobFormValues, userId: string) {
  return {
    user_id: userId,
    title: values.title,
    company_name: values.companyName || null,
    description: values.description,
    responsibilities: values.responsibilities || null,
  }
}

function requirementData(requirement: JobRequirementFormValues, jobId: string) {
  return {
    job_id: jobId,
    category: requirement.category,
    description: requirement.description,
    importance: requirement.importance,
    weight: requirement.weight,
  }
}

async function readJobRow(jobId: string): Promise<JobRow> {
  const tables = requireTablesDB()

  try {
    return await tables.getRow<JobRow>({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.jobs,
      rowId: jobId,
    })
  } catch (error) {
    if (isRowNotFoundError(error)) {
      throw new DataNotFoundError()
    }

    throw error
  }
}

async function listRequirementRows(jobId: string): Promise<JobRequirementRow[]> {
  const tables = requireTablesDB()

  const result = await tables.listRows<JobRequirementRow>({
    databaseId: requireDatabaseId(),
    tableId: TABLE_IDS.jobRequirements,
    queries: [
      Query.equal('job_id', jobId),
      Query.orderAsc('$createdAt'),
      Query.limit(DATA_LIST_LIMIT),
    ],
  })

  return result.rows
}

async function runInTransaction<T>(
  work: (tables: TablesDB, transactionId: string) => Promise<T>,
): Promise<T> {
  const tables = requireTablesDB()
  const transaction = await tables.createTransaction()

  try {
    const result = await work(tables, transaction.$id)
    await tables.updateTransaction({
      transactionId: transaction.$id,
      commit: true,
      rollback: false,
    })
    return result
  } catch (error) {
    try {
      await tables.updateTransaction({
        transactionId: transaction.$id,
        rollback: true,
        commit: false,
      })
    } catch {
      // The transaction may already have failed to commit. Preserve the original
      // error so the UI can show a safe message.
    }

    throw error
  }
}

export async function listJobs(userId: string): Promise<Job[]> {
  const tables = requireTablesDB()

  const result = await tables.listRows<JobRow>({
    databaseId: requireDatabaseId(),
    tableId: TABLE_IDS.jobs,
    queries: [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(DATA_LIST_LIMIT),
    ],
  })

  return result.rows.map((row) => parseJobRow(row, userId))
}

export async function getJobWithRequirements(
  userId: string,
  jobId: string,
): Promise<JobWithRequirements> {
  const jobRow = await readJobRow(jobId)
  const job = parseJobRow(jobRow, userId)
  const requirementRows = await listRequirementRows(jobId)

  return {
    ...job,
    requirements: requirementRows.map((row) => parseRequirementRow(row, jobId)),
  }
}

export async function createJob(userId: string, input: JobInput): Promise<string> {
  const values = parseJobInput(input)
  const jobId = ID.unique()

  await runInTransaction(async (tables, transactionId) => {
    await tables.createRow<JobRow>({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.jobs,
      rowId: jobId,
      data: jobData(values, userId),
      permissions: buildOwnerPermissions(userId),
      transactionId,
    })

    for (const requirement of values.requirements) {
      await tables.createRow<JobRequirementRow>({
        databaseId: requireDatabaseId(),
        tableId: TABLE_IDS.jobRequirements,
        rowId: ID.unique(),
        data: requirementData(requirement, jobId),
        permissions: buildOwnerPermissions(userId),
        transactionId,
      })
    }
  })

  return jobId
}

/**
 * Update the job and synchronise its requirements atomically. Existing
 * requirement IDs are only accepted when they belong to the fetched job,
 * preventing a submitted ID from targeting another record.
 */
export async function updateJob(userId: string, jobId: string, input: JobInput): Promise<void> {
  const values = parseJobInput(input)
  const existing = await getJobWithRequirements(userId, jobId)
  const existingById = new Map(existing.requirements.map((requirement) => [requirement.id, requirement]))
  const keptIds = new Set<string>()

  await runInTransaction(async (tables, transactionId) => {
    await tables.updateRow<JobRow>({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.jobs,
      rowId: jobId,
      data: jobData(values, userId),
      permissions: buildOwnerPermissions(userId),
      transactionId,
    })

    for (const requirement of values.requirements) {
      if (requirement.id) {
        if (!existingById.has(requirement.id)) {
          throw new DataAuthorizationError()
        }

        keptIds.add(requirement.id)

        await tables.updateRow<JobRequirementRow>({
          databaseId: requireDatabaseId(),
          tableId: TABLE_IDS.jobRequirements,
          rowId: requirement.id,
          data: requirementData(requirement, jobId),
          permissions: buildOwnerPermissions(userId),
          transactionId,
        })
        continue
      }

      await tables.createRow<JobRequirementRow>({
        databaseId: requireDatabaseId(),
        tableId: TABLE_IDS.jobRequirements,
        rowId: ID.unique(),
        data: requirementData(requirement, jobId),
        permissions: buildOwnerPermissions(userId),
        transactionId,
      })
    }

    for (const requirement of existing.requirements) {
      if (keptIds.has(requirement.id)) {
        continue
      }

      await tables.deleteRow({
        databaseId: requireDatabaseId(),
        tableId: TABLE_IDS.jobRequirements,
        rowId: requirement.id,
        transactionId,
      })
    }
  })
}

export async function deleteJob(userId: string, jobId: string): Promise<void> {
  const existing = await getJobWithRequirements(userId, jobId)

  await runInTransaction(async (tables, transactionId) => {
    for (const requirement of existing.requirements) {
      await tables.deleteRow({
        databaseId: requireDatabaseId(),
        tableId: TABLE_IDS.jobRequirements,
        rowId: requirement.id,
        transactionId,
      })
    }

    await tables.deleteRow({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.jobs,
      rowId: jobId,
      transactionId,
    })
  })
}
