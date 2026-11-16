import { Client } from 'appwrite'
import { environment } from './env'

/**
 * Browser-side Appwrite client. It uses only the public endpoint and project
 * ID. Authentication sessions will be attached in the authentication phase.
 *
 * A null client means configuration is incomplete; the diagnostic page is
 * responsible for explaining what is missing.
 */
export const appwriteClient: Client | null =
  environment.endpoint && environment.projectId
    ? new Client().setEndpoint(environment.endpoint).setProject(environment.projectId)
    : null
