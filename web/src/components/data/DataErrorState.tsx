import { RefreshCw } from 'lucide-react'
import { Button } from '../common/Button'
import { FormAlert } from '../forms/FormAlert'

interface DataErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function DataErrorState({ title = 'Data could not be loaded', message, onRetry }: DataErrorStateProps) {
  return (
    <div className="space-y-4">
      <FormAlert tone="error" title={title}>
        {message}
      </FormAlert>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
