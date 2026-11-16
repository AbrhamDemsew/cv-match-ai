import { AppwriteException } from 'appwrite'
import { appwriteClient } from '../lib/appwrite'
import { ENV_KEYS } from '../lib/env'
import type { AppwriteConnectionCheck } from '../types/appwrite'

const PING_TIMEOUT_MS = 10_000
const TIMEOUT_SENTINEL = Symbol('appwrite-ping-timeout')

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(TIMEOUT_SENTINEL), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  })
}

function classifyError(error: unknown): AppwriteConnectionCheck {
  if (error === TIMEOUT_SENTINEL) {
    return {
      status: 'timeout',
      message: `The Appwrite endpoint did not respond within ${PING_TIMEOUT_MS / 1_000} seconds.`,
    }
  }

  if (error instanceof AppwriteException) {
    if (error.code === 404 && error.type === 'project_not_found') {
      return {
        status: 'project_not_found',
        message:
          'The endpoint responded, but it did not recognize this project ID. Confirm the ID and the Appwrite Cloud region.',
        code: error.code,
        type: error.type,
      }
    }

    if (error.code === 403) {
      return {
        status: 'origin_rejected',
        message:
          'The Appwrite API rejected this request from the current browser origin. Confirm the endpoint and register this hostname as a Web platform.',
        code: error.code,
        type: error.type,
      }
    }

    return {
      status: 'error',
      message: 'The Appwrite API returned an unexpected error during the connection check.',
      code: error.code,
      type: error.type,
    }
  }

  if (error instanceof TypeError) {
    return {
      status: 'unreachable',
      message:
        'The endpoint could not be reached from this browser. Check the URL, your network, and whether this hostname is registered as an Appwrite Web platform.',
    }
  }

  return {
    status: 'unreachable',
    message: 'The Appwrite endpoint could not be reached. Check the configured URL and your network.',
  }
}

/**
 * Lightweight browser-side connectivity check.
 *
 * It calls Appwrite's public ping route with the configured project header. It
 * does not create a session, read user data, or access any database or bucket.
 */
export async function checkAppwriteConnection(): Promise<AppwriteConnectionCheck> {
  if (!appwriteClient) {
    return {
      status: 'not_configured',
      message: `Set ${ENV_KEYS.endpoint} and ${ENV_KEYS.projectId} in web/.env.local, then restart the dev server.`,
    }
  }

  const startedAt = performance.now()

  try {
    await withTimeout(appwriteClient.ping(), PING_TIMEOUT_MS)

    return {
      status: 'connected',
      latencyMs: Math.round(performance.now() - startedAt),
    }
  } catch (error) {
    return classifyError(error)
  }
}
