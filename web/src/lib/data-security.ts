import { DataAuthorizationError } from './data-errors.ts'

/**
 * Defense in depth for the browser layer. Appwrite row/file permissions remain
 * the security boundary; this check prevents the UI from acting on a record
 * whose ownership metadata does not match the signed-in account.
 */
export function assertRecordOwnership(
  recordUserId: string | null | undefined,
  currentUserId: string,
): void {
  if (!recordUserId || recordUserId !== currentUserId) {
    throw new DataAuthorizationError()
  }
}
