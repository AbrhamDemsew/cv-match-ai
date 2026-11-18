import { TablesDB, type Models } from 'appwrite'
import { appwriteClient } from '../lib/appwrite'
import { TABLE_IDS, requireDatabaseId } from '../lib/data-config'
import { buildOwnerPermissions } from '../lib/appwrite-permissions'
import {
  DataAuthorizationError,
  DataConfigurationError,
  DataValidationError,
  isRowConflictError,
  isRowNotFoundError,
} from '../lib/data-errors'
import { profileRowSchema, type ProfileRowData } from '../lib/validation/data'
import { displayNameSchema } from '../lib/validation/profile'
import type { AuthUser } from '../types/auth'
import type { UserProfile } from '../types/data'

type ProfileRow = Models.Row & ProfileRowData

const tablesDB = appwriteClient ? new TablesDB(appwriteClient) : null

function requireTablesDB(): TablesDB {
  requireDatabaseId()
  if (!tablesDB) {
    throw new DataConfigurationError()
  }

  return tablesDB
}

function parseProfileRow(row: ProfileRow, expectedUserId: string): UserProfile {
  const parsed = profileRowSchema.safeParse(row)

  if (!parsed.success) {
    throw new DataValidationError('The profile data returned by Appwrite was not in the expected format.')
  }

  if (parsed.data.$id !== expectedUserId) {
    throw new DataAuthorizationError()
  }

  return {
    id: parsed.data.$id,
    displayName: parsed.data.display_name,
    createdAt: parsed.data.$createdAt,
    updatedAt: parsed.data.$updatedAt,
  }
}

function defaultDisplayName(user: AuthUser): string {
  const candidate = user.name.trim() || user.email.split('@')[0]?.trim() || 'CVMatch user'
  return Array.from(candidate).slice(0, 128).join('')
}

async function readProfileRow(userId: string): Promise<ProfileRow | null> {
  const tables = requireTablesDB()

  try {
    return await tables.getRow<ProfileRow>({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.profiles,
      rowId: userId,
    })
  } catch (error) {
    if (isRowNotFoundError(error)) {
      return null
    }

    throw error
  }
}

/**
 * Read the current user's profile, creating it once when missing. The profile
 * row ID is the authenticated Appwrite user ID, which makes this operation
 * naturally idempotent and prevents a separate random-ID lookup from drifting.
 */
export async function getOrCreateProfile(user: AuthUser): Promise<UserProfile> {
  const existing = await readProfileRow(user.id)
  if (existing) {
    return parseProfileRow(existing, user.id)
  }

  const tables = requireTablesDB()

  try {
    const created = await tables.createRow<ProfileRow>({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.profiles,
      rowId: user.id,
      data: {
        display_name: defaultDisplayName(user),
      },
      permissions: buildOwnerPermissions(user.id),
    })

    return parseProfileRow(created, user.id)
  } catch (error) {
    // Another tab may have created the profile between the read and create
    // calls. Re-read it instead of surfacing a false failure.
    if (isRowConflictError(error)) {
      const racedProfile = await readProfileRow(user.id)
      if (racedProfile) {
        return parseProfileRow(racedProfile, user.id)
      }

      throw new DataAuthorizationError(
        'A profile for this account exists but cannot be accessed by this session.',
      )
    }

    throw error
  }
}

export async function updateProfile(user: AuthUser, displayName: string): Promise<UserProfile> {
  const parsedName = displayNameSchema.safeParse(displayName)
  if (!parsedName.success) {
    throw new DataValidationError(
      parsedName.error.issues[0]?.message ?? 'Enter a valid display name.',
    )
  }

  await getOrCreateProfile(user)

  const tables = requireTablesDB()

  try {
    const updated = await tables.updateRow<ProfileRow>({
      databaseId: requireDatabaseId(),
      tableId: TABLE_IDS.profiles,
      rowId: user.id,
      data: {
        display_name: parsedName.data,
      },
      permissions: buildOwnerPermissions(user.id),
    })

    return parseProfileRow(updated, user.id)
  } catch (error) {
    if (isRowNotFoundError(error)) {
      throw new DataAuthorizationError()
    }

    throw error
  }
}
