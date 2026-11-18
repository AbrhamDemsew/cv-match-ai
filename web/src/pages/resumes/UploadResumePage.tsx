import { ArrowLeft, FileCheck2, FileText, ShieldCheck, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { PageHeader } from '../../components/common/PageHeader'
import { DataConfigurationNotice } from '../../components/data/DataConfigurationNotice'
import { FormAlert } from '../../components/forms/FormAlert'
import { usePageTitle } from '../../hooks/use-page-title'
import { useResumes } from '../../hooks/use-resumes'
import { getDataErrorMessage } from '../../lib/data-errors'
import { environment } from '../../lib/env'
import {
  MAX_RESUME_FILE_BYTES,
  MAX_RESUME_PAGE_COUNT,
  validateResumeFile,
} from '../../lib/resume-file'
import { formatFileSize } from '../../utils/format'

export function UploadResumePage() {
  usePageTitle('Upload CV')
  const navigate = useNavigate()
  const { uploadResume, isUploading } = useResumes()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const validationRequestRef = useRef(0)

  async function validateSelectedFile(file: File): Promise<boolean> {
    const requestId = ++validationRequestRef.current
    setIsValidating(true)
    setValidationMessage(null)

    const result = await validateResumeFile(file)

    // A quick second file selection supersedes the earlier async read. Only the
    // latest validation may update the form state.
    if (requestId !== validationRequestRef.current) {
      return false
    }

    setIsValidating(false)

    if (!result.valid) {
      setValidationMessage(result.message)
      return false
    }

    return true
  }

  async function handleFileChange(file: File | null) {
    validationRequestRef.current += 1
    setSelectedFile(file)
    setValidationMessage(null)
    setUploadError(null)
    setProgress(0)

    if (!file) {
      setIsValidating(false)
      return
    }

    await validateSelectedFile(file)
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setValidationMessage('Choose a PDF file first.')
      return
    }

    setUploadError(null)
    const valid = await validateSelectedFile(selectedFile)
    if (!valid) {
      return
    }

    try {
      setProgress(0)
      const uploadedResume = await uploadResume({
        file: selectedFile,
        onProgress: (percentage) => setProgress(percentage),
      })
      navigate('/resumes', {
        replace: true,
        state: {
          notice: `“${uploadedResume.originalFilename}” was uploaded to your private CV library.`,
        },
      })
    } catch (error) {
      setUploadError(getDataErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        eyebrow="CV library"
        title="Upload a CV"
        description="Select a PDF. The browser checks the file metadata and PDF signature before the private upload begins; page and text checks belong to Phase 4."
        actions={
          <Link
            to="/resumes"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to CV library
          </Link>
        }
      />

      <div className="mt-8 space-y-5">
        {!environment.isDataConfigured ? <DataConfigurationNotice /> : null}

        {uploadError ? <FormAlert tone="error">{uploadError}</FormAlert> : null}

        <section
          aria-labelledby="upload-heading"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
        >
          <h2 id="upload-heading" className="text-lg font-semibold tracking-tight text-slate-950">
            Select a PDF
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Maximum file size: 10 MB. The Phase 4 extraction pipeline will enforce the{' '}
            {MAX_RESUME_PAGE_COUNT}-page limit and reject encrypted, empty, or image-only PDFs.
          </p>

          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <label htmlFor="resume-file" className="block text-sm font-medium text-slate-900">
              PDF file
            </label>
            <input
              id="resume-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
              disabled={isUploading || isValidating || !environment.isDataConfigured}
              className="mt-2 block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-800 disabled:cursor-not-allowed"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              PDF only. Accepted extension: .pdf; accepted MIME type: application/pdf.
            </p>
          </div>

          {selectedFile ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                {validationMessage ? (
                  <FileText className="size-5" aria-hidden="true" />
                ) : (
                  <FileCheck2 className="size-5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {selectedFile.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatFileSize(selectedFile.size)} · {selectedFile.type || 'Unknown MIME type'}
                </p>
              </div>
            </div>
          ) : null}

          {validationMessage ? (
            <div className="mt-5">
              <FormAlert tone="error">{validationMessage}</FormAlert>
            </div>
          ) : null}

          {isUploading ? (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-900">Uploading to private storage…</span>
                <span className="text-slate-600">{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="CV upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className="h-full rounded-full bg-brand-700 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              The file is stored privately. Only your account can read or delete it.
            </p>
            <Button
              onClick={() => void handleSubmit()}
              isLoading={isUploading}
              disabled={
                !selectedFile ||
                isValidating ||
                Boolean(validationMessage) ||
                !environment.isDataConfigured
              }
            >
              <UploadCloud className="size-4" aria-hidden="true" />
              Upload CV
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">What happens in this phase</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>The PDF is uploaded with a generated storage ID, never your filename.</li>
            <li>A metadata row records the original filename, size, MIME type, and status.</li>
            <li>Text extraction, page counting, AI analysis, and reports are not implemented yet.</li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Browser-side size limit: {formatFileSize(MAX_RESUME_FILE_BYTES)}.
          </p>
        </section>
      </div>
    </div>
  )
}
