import { AppwriteException } from 'appwrite'

/**
 * Configuration/auth flow errors with display-safe messages. These never
 * contain Appwrite credentials or raw provider responses.
 */
export class AuthConfigurationError extends Error {
  constructor() {
    super('Authentication is not configured yet. Open the system check for setup steps.')
    this.name = 'AuthConfigurationError'
  }
}

export class AuthSessionSetupError extends Error {
  constructor() {
    super(
      'Your account was created, but we could not start a session. Please sign in with your new account.',
    )
    this.name = 'AuthSessionSetupError'
  }
}

const friendlyMessagesByType: Record<string, string> = {
  user_invalid_credentials: 'The email or password you entered is incorrect. Please try again.',
  user_email_already_exists: 'An account with this email already exists. Try signing in instead.',
  user_already_exists: 'An account with this email already exists. Try signing in instead.',
  user_blocked: 'Your account has been temporarily suspended. Please contact support.',
  user_unauthorized: 'Your session has expired. Please sign in again.',
  user_session_not_found: 'Your session has expired. Please sign in again.',
  user_password_mismatch: 'The passwords do not match.',
  user_invalid_token:
    'This reset link is invalid or has expired. Request a new password recovery email.',
  user_not_found: 'We could not find a matching account or reset request.',
  user_auth_method_unsupported:
    'Email and password sign-in is disabled for this project. Enable it in Appwrite Console.',
  password_pwned:
    'That password has appeared in a known data breach. Choose a different password.',
  password_personal_data:
    'Your password must not contain your name, email, phone number, or user ID.',
  password_recently_used: 'Choose a password you have not used recently.',
  general_rate_limit_exceeded: 'Too many attempts. Please wait a moment and try again.',
  general_unknown_origin:
    'The Appwrite API rejected this browser origin. Check the Web platform settings.',
  general_smtp_disabled:
    'Password recovery email is not configured for this project yet. Contact the project owner.',
  general_service_disabled: 'The authentication service is disabled for this project.',
  project_not_found:
    'The Appwrite project configuration is invalid. Open the system check to review it.',
  project_unknown:
    'The Appwrite project configuration is invalid. Open the system check to review it.',
}

/**
 * Detect the normal "no session" response from Appwrite so refresh/session
 * restoration can be treated as signed out rather than a fatal error.
 */
export function isMissingSessionError(error: unknown): boolean {
  if (!(error instanceof AppwriteException)) {
    return false
  }

  if (error.code === 401) {
    return true
  }

  return error.type === 'user_session_not_found'
}

/**
 * Convert Appwrite and network failures into safe, user-facing messages.
 * Raw Appwrite messages and stack traces are never returned to the UI.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthConfigurationError || error instanceof AuthSessionSetupError) {
    return error.message
  }

  if (error instanceof AppwriteException) {
    const typeMessage = friendlyMessagesByType[error.type]
    if (typeMessage) {
      return typeMessage
    }

    if (error.code === 429) {
      return 'Too many attempts. Please wait a moment and try again.'
    }

    if (error.code >= 500) {
      return 'The authentication service is temporarily unavailable. Please try again shortly.'
    }

    if (error.code === 401) {
      return 'Your session has expired. Please sign in again.'
    }

    if (error.code === 403) {
      return 'The request was refused. Check the Appwrite project and Web platform settings.'
    }

    return 'We could not complete that request. Please try again.'
  }

  if (error instanceof TypeError) {
    return 'Unable to reach the authentication service. Check your connection and Appwrite configuration.'
  }

  return 'Something went wrong while completing that request. Please try again.'
}
