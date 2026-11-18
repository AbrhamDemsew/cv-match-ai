import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
  trailing?: ReactNode
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField(
    { id, label, hint, error, required, className = '', ...textareaProps },
    ref,
  ) {
    const generatedId = useId()
    const fieldId = id ?? `textarea-${generatedId}`
    const hintId = hint ? `${fieldId}-hint` : undefined
    const errorId = error ? `${fieldId}-error` : undefined
    const describedBy = errorId ?? hintId

    return (
      <div>
        <label htmlFor={fieldId} className="block text-sm font-medium text-slate-900">
          {label}
          {required ? (
            <span className="ml-1 text-rose-600" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>

        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20'
          } ${className}`}
          {...textareaProps}
        />

        {hint && !error ? (
          <p id={hintId} className="mt-1.5 text-xs leading-5 text-slate-500">
            {hint}
          </p>
        ) : null}

        {error ? (
          <p id={errorId} className="mt-1.5 text-xs leading-5 text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)
