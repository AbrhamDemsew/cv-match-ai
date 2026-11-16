import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { FormField } from './FormField'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  hint?: string
  error?: string
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ id, label, hint, error, ...inputProps }, ref) {
    const generatedId = useId()
    const inputId = id ?? `password-${generatedId}`
    const [isVisible, setIsVisible] = useState(false)
    const actionLabel = `${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`

    return (
      <FormField
        ref={ref}
        id={inputId}
        label={label}
        hint={hint}
        error={error}
        type={isVisible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setIsVisible((visible) => !visible)}
            className="grid size-9 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-brand-700"
            aria-label={actionLabel}
            aria-pressed={isVisible}
            aria-controls={inputId}
            title={actionLabel}
          >
            {isVisible ? (
              <EyeOff className="size-4.5" aria-hidden="true" />
            ) : (
              <Eye className="size-4.5" aria-hidden="true" />
            )}
          </button>
        }
        {...inputProps}
      />
    )
  },
)
