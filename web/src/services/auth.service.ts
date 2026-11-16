import { Account, AppwriteException, ID, type Models } from 'appwrite'
import { AuthConfigurationError, AuthSessionSetupError, isMissingSessionError } from '../lib/auth-errors'
import { appwriteClient } from '../lib/appwrite'
import type {
  AuthUser,
  LoginCredentials,
  PasswordResetDetails,
  RegistrationDetails,
} from '../types/auth'

const account = appwriteClient ? new Account(appwriteClient) : null

function requireAccount(): Account {
  if (!account) {
    throw new AuthConfigurationError()
  }

  return account
}

function toAuthUser(user: Models.User): AuthUser {
  return {
    id: user.$id,
    name: user.name,
    email: user.email,
    emailVerification: user.emailVerification,
    createdAt: user.$createdAt,
  }
}

/**
 * Restore the current Appwrite session. Missing or expired sessions are a
 * normal signed-out state; configuration/network failures are thrown so the
 * UI can offer a retry instead of silently logging the user out.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!account) {
    return null
  }

  try {
    return toAuthUser(await account.get())
  } catch (error) {
    if (isMissingSessionError(error)) {
      return null
    }

    throw error
  }
}

export async function loginWithEmail(credentials: LoginCredentials): Promise<AuthUser> {
  const client = requireAccount()

  await client.createEmailPasswordSession({
    email: credentials.email,
    password: credentials.password,
  })

  return toAuthUser(await client.get())
}

export async function registerAccount(details: RegistrationDetails): Promise<AuthUser> {
  const client = requireAccount()

  const user = await client.create({
    userId: ID.unique(),
    email: details.email,
    password: details.password,
    name: details.name,
  })

  try {
    await client.createEmailPasswordSession({
      email: details.email,
      password: details.password,
    })
  } catch {
    // The account exists at this point. Do not leave the user with a silent
    // failure or a misleading "registration failed" message.
    throw new AuthSessionSetupError()
  }

  return toAuthUser(user)
}

export async function logoutCurrentSession(): Promise<void> {
  if (!account) {
    return
  }

  try {
    await account.deleteSession({ sessionId: 'current' })
  } catch (error) {
    if (isMissingSessionError(error)) {
      return
    }

    throw error
  }
}

export async function requestPasswordRecovery(email: string, redirectUrl: string): Promise<void> {
  const client = requireAccount()

  try {
    await client.createRecovery({ email, url: redirectUrl })
  } catch (error) {
    // Keep the response non-enumerating: the UI shows the same success message
    // whether or not an account exists for the email.
    if (error instanceof AppwriteException && error.type === 'user_not_found') {
      return
    }

    throw error
  }
}

export async function completePasswordRecovery(details: PasswordResetDetails): Promise<void> {
  const client = requireAccount()

  await client.updateRecovery({
    userId: details.userId,
    secret: details.secret,
    password: details.password,
  })
}
