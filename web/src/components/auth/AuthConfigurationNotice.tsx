import { Link } from 'react-router-dom'
import { FormAlert } from '../forms/FormAlert'

export function AuthConfigurationNotice() {
  return (
    <FormAlert tone="warning" title="Authentication is not configured">
      Add the public Appwrite endpoint and project ID to <code>web/.env.local</code>, then restart
      the dev server.{' '}
      <Link to="/diagnostics" className="font-medium underline underline-offset-2">
        Open the system check
      </Link>
      .
    </FormAlert>
  )
}
