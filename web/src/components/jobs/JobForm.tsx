import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import {
  JOB_REQUIREMENT_CATEGORIES,
  JOB_REQUIREMENT_CATEGORY_LABELS,
  JOB_REQUIREMENT_IMPORTANCE_LABELS,
  JOB_REQUIREMENT_IMPORTANCE_LEVELS,
  MAX_JOB_REQUIREMENTS,
} from '../../lib/data-constants'
import {
  jobFormSchema,
  type JobFormValues,
  type JobRequirementFormValues,
} from '../../lib/validation/jobs'
import { Button } from '../common/Button'
import { FormAlert } from '../forms/FormAlert'
import { FormField } from '../forms/FormField'
import { SelectField } from '../forms/SelectField'
import { TextAreaField } from '../forms/TextAreaField'

const categoryOptions = JOB_REQUIREMENT_CATEGORIES.map((value) => ({
  value,
  label: JOB_REQUIREMENT_CATEGORY_LABELS[value],
}))

const importanceOptions = JOB_REQUIREMENT_IMPORTANCE_LEVELS.map((value) => ({
  value,
  label: JOB_REQUIREMENT_IMPORTANCE_LABELS[value],
}))

const emptyRequirement: JobRequirementFormValues = {
  category: 'required_skill',
  description: '',
  importance: 'required',
  weight: 1,
}

interface JobFormProps {
  initialValues: JobFormValues
  submitLabel: string
  isSubmitting: boolean
  submitError?: string | null
  onSubmit: (values: JobFormValues) => Promise<void>
}

export function JobForm({
  initialValues,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
}: JobFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: initialValues,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'requirements',
    keyName: 'fieldKey',
  })

  const submitForm = handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <form className="space-y-6" onSubmit={(event) => void submitForm(event)} noValidate>
      {submitError ? <FormAlert tone="error">{submitError}</FormAlert> : null}

      <section
        aria-labelledby="job-details-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
      >
        <h2 id="job-details-heading" className="text-lg font-semibold tracking-tight text-slate-950">
          Job details
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Save the role information you want to compare against your CV. This data stays private
          to your account.
        </p>

        <div className="mt-6 grid gap-5">
          <FormField
            label="Job title"
            required
            placeholder="Senior Frontend Engineer"
            error={errors.title?.message}
            {...register('title')}
          />
          <FormField
            label="Company"
            placeholder="Acme Inc."
            hint="Optional."
            error={errors.companyName?.message}
            {...register('companyName')}
          />
          <TextAreaField
            label="Job description"
            required
            rows={9}
            placeholder="Paste the full job description here."
            hint="Plain text. The description is stored as entered and is never rendered as HTML."
            error={errors.description?.message}
            {...register('description')}
          />
          <TextAreaField
            label="Responsibilities"
            rows={5}
            placeholder={'Optional. One responsibility per line, for example:\nLead frontend architecture\nMentor engineers'}
            hint="Optional free text. Keep each responsibility on its own line for easier review."
            error={errors.responsibilities?.message}
            {...register('responsibilities')}
          />
        </div>
      </section>

      <section
        aria-labelledby="job-requirements-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id="job-requirements-heading"
              className="text-lg font-semibold tracking-tight text-slate-950"
            >
              Requirements
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Break the role into individual, reviewable requirements. The weight is stored for
              later deterministic scoring; it is not an AI judgment.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => append({ ...emptyRequirement })}
            disabled={fields.length >= MAX_JOB_REQUIREMENTS}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add requirement
          </Button>
        </div>

        {errors.requirements?.root?.message ? (
          <div className="mt-4">
            <FormAlert tone="error">{errors.requirements.root.message}</FormAlert>
          </div>
        ) : null}

        {fields.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-900">No requirements added yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">
              You can save this job now and add requirements later, or add them now to prepare for
              matching.
            </p>
          </div>
        ) : (
          <ol className="mt-6 space-y-4">
            {fields.map((field, index) => {
              const requirementErrors = errors.requirements?.[index]
              return (
                <li
                  key={field.fieldKey}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
                >
                  <input
                    type="hidden"
                    {...register(`requirements.${index}.id`)}
                  />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Requirement {index + 1}
                    </p>
                    <Button
                      variant="ghost"
                      className="!px-2.5 !py-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => remove(index)}
                      aria-label={`Remove requirement ${index + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_8rem]">
                    <SelectField
                      label="Category"
                      options={categoryOptions}
                      error={requirementErrors?.category?.message}
                      {...register(`requirements.${index}.category`)}
                    />
                    <SelectField
                      label="Importance"
                      options={importanceOptions}
                      error={requirementErrors?.importance?.message}
                      {...register(`requirements.${index}.importance`)}
                    />
                    <FormField
                      label="Weight"
                      type="number"
                      inputMode="decimal"
                      min={0.1}
                      max={10}
                      step={0.1}
                      error={requirementErrors?.weight?.message}
                      {...register(`requirements.${index}.weight`, { valueAsNumber: true })}
                    />
                  </div>

                  <div className="mt-4">
                    <TextAreaField
                      label="Requirement"
                      rows={2}
                      required
                      placeholder="Three or more years of production React experience"
                      error={requirementErrors?.description?.message}
                      {...register(`requirements.${index}.description`)}
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Maximum {MAX_JOB_REQUIREMENTS} requirements. Weights must be between 0.1 and 10.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          to="/jobs"
          className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          Cancel
        </Link>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
