import { Client } from 'appwrite'
import { environment } from './env'

/**
 * Browser-side Appwrite client. It uses only the public endpoint and project
 * ID, and the Appwrite Web SDK attaches the current user's session.
 *
 * A null client means configuration is incomplete; the diagnostic page is
 * responsible for explaining what is missing.
 */
export const appwriteClient: Client | null =
  environment.endpoint && environment.projectId
    ? new Client().setEndpoint(environment.endpoint).setProject(environment.projectId)
    : null
