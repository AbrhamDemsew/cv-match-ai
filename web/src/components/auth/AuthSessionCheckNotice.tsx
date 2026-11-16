import { useAuth } from '../../hooks/use-auth'
import { FormAlert } from '../forms/FormAlert'

export function AuthSessionCheckNotice() {
  const { status, error } = useAuth()

  if (status !== 'error') {
    return null
  }

  return (
    <FormAlert tone="warning" title="We could not verify an existing session">
      {error ?? 'The session check failed.'} You can still try signing in below.
    </FormAlert>
  )
}
