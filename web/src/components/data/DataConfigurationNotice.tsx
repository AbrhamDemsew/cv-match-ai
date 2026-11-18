import { Link } from 'react-router-dom'
import { ENV_KEYS } from '../../lib/env'
import { FormAlert } from '../forms/FormAlert'

export function DataConfigurationNotice() {
  return (
    <FormAlert tone="warning" title="CV and job storage is not configured">
      Add <code>{ENV_KEYS.databaseId}</code> and <code>{ENV_KEYS.resumesBucketId}</code> to{' '}
      <code>web/.env.local</code>, then restart the dev server. The database tables and private
      bucket must also be created in Appwrite.{' '}
      <Link to="/diagnostics" className="font-medium underline underline-offset-2">
        Open the system check
      </Link>
      .
    </FormAlert>
  )
}
