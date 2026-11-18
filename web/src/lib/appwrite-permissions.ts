import { Permission, Role } from 'appwrite'

/**
 * Row and file permissions for an owned private resource.
 *
 * Appwrite's `create` permission belongs at table/bucket level, not on an
 * individual row or file. These permissions are deliberately narrow: only the
 * authenticated owner can read, update, or delete the resource.
 */
export function buildOwnerPermissions(userId: string): string[] {
  if (!userId.trim()) {
    throw new Error('An authenticated user ID is required to build resource permissions.')
  }

  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}
