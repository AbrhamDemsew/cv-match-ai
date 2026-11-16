import { BadgeCheck, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { Brand } from '../layout/Brand'

const assurances = [
  {
    icon: ShieldCheck,
    text: 'Sessions are managed by the Appwrite Web SDK, not manually stored tokens.',
  },
  {
    icon: LockKeyhole,
    text: 'Protected routes keep private workspace pages behind a verified session.',
  },
  {
    icon: BadgeCheck,
    text: 'Account data stays in Appwrite Auth and is displayed only to the signed-in user.',
  },
] as const

const copyrightYear = new Date().getFullYear()

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand />
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
          >
            Back to overview
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:gap-16 lg:px-8 lg:py-16">
        <aside className="hidden lg:block">
          <p className="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Secure account access
          </p>
          <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight text-slate-950 text-balance">
            Your CV workspace starts with a trusted account.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
            CVMatch AI uses Appwrite Authentication for account creation, sign-in, session
            restoration, and password recovery. We never build a custom password system.
          </p>

          <ul className="mt-8 space-y-4">
            {assurances.map((item) => (
              <li key={item.text} className="flex gap-3 text-sm leading-6 text-slate-600">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-slate-200">
                  <item.icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="pt-1.5">{item.text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-lg rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
            Route protection is a user-experience guard. Appwrite resource permissions and
            server-side checks must still enforce ownership on every record and file in later
            phases.
          </p>
        </aside>

        <div className="w-full max-w-md justify-self-center lg:max-w-none">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {copyrightYear} CVMatch AI</p>
          <Link to="/diagnostics" className="font-medium text-slate-600 hover:text-brand-700">
            System check
          </Link>
        </div>
      </footer>
    </div>
  )
}
