import { ShieldCheck } from 'lucide-react'

const securityRules = [
  'Every VITE_ variable is embedded in the browser bundle. Treat those values as public.',
  'Never add GEMINI_API_KEY, an Appwrite server API key, or any other secret to web/.env.local.',
  'The Gemini key belongs only in the Appwrite Function server-side environment, never in frontend code.',
  'The browser uses the Appwrite Web SDK with a user session. Privileged work belongs in Appwrite Functions.',
  '.env.local is git-ignored. If a secret ever reaches a VITE_ variable or a commit, rotate it immediately.',
] as const

export function SecurityNotes() {
  return (
    <section
      aria-labelledby="security-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="security-heading" className="text-lg font-semibold tracking-tight text-slate-950">
            Keep secrets out of the browser
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            This page never asks for an API key. Confirming the endpoint and project ID is enough
            for a browser-side connection check.
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {securityRules.map((rule) => (
          <li key={rule} className="flex gap-2.5 text-sm leading-6 text-slate-600">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
