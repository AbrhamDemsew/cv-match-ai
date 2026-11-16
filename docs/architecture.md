# Architecture and Phase Decisions

## Context

CVMatch AI is a web-first application backed by Appwrite Cloud. A Python Appwrite Function will later run the trusted analysis pipeline and Gemini calls. A shared Python package will keep scoring logic reusable by the future desktop client. Phases 1 and 2 establish the repository, frontend foundation, authentication, and the authenticated application shell.

The full product and engineering requirements are in [`instruction.md`](../instruction.md).

## Repository shape

The project is a monorepo with independent technology boundaries:

- `web/` — React, TypeScript, Vite, Tailwind CSS, Appwrite Web SDK.
- `docs/` — architecture, setup, and security documentation.
- `appwrite/` — future Appwrite Function and configuration.
- `packages/python_core/` — future shared Python domain logic.
- `desktop/` — future PySide6 client.

Phase 1 deliberately does not create empty directories for future phases.

### Why `web/` is a standalone package

There is no root `package.json` or npm workspace yet. The web app is the only JavaScript package, and Appwrite Sites expects a clear root directory, install command, build command, and output directory. Adding workspace tooling now would add complexity without a current benefit. A root workspace can be introduced later if shared TypeScript packages appear.

## Frontend structure

```text
web/src/
├── app/          Application composition: providers and routes
├── components/   Reusable layout, common, and diagnostic components
├── hooks/        React hooks around services and page metadata
├── lib/          Framework/infrastructure configuration
├── pages/        Route-level screens
├── services/     External I/O; components never call Appwrite directly
├── styles/       Global Tailwind CSS and design tokens
├── types/        Shared TypeScript types
├── App.tsx
└── main.tsx
```

Later phases will add `components/forms`, `components/resume`, `components/jobs`, `components/analysis`, protected dashboard pages, and service modules for auth, resumes, jobs, analyses, and reports.

### Responsibilities

- **Pages** compose sections and own route-level state, but stay thin.
- **Components** are small, accessible presentational units.
- **Hooks** wrap TanStack Query or browser APIs.
- **Services** contain all network/SDK calls. React components do not import `appwrite` services directly.
- **lib** holds configuration and infrastructure that is not a domain service.

## Decision: Appwrite Web SDK with a central auth provider

The app uses the official `appwrite` Web SDK directly through a single client module (`lib/appwrite.ts`). It does not use the newer `@appwrite.io/react` wrapper.

Rationale:

- `instruction.md` requires the Appwrite Web SDK and a single authentication provider/hook in Phase 2.
- Keeping the client explicit avoids hiding session and error behavior behind another abstraction.
- Server API keys are never present in the browser. The Web SDK is initialized with only the public endpoint and project ID.

The client is exported as `Client | null`. A null client means required configuration is missing; the UI reports that state instead of crashing.

## Authentication architecture

### Service boundary

All Appwrite Account calls live in `services/auth.service.ts`:

- `getCurrentUser()` restores the current session and maps the Appwrite user to a narrow `AuthUser` type.
- `loginWithEmail()` creates an email/password session and loads the user.
- `registerAccount()` creates the account, starts a session, and returns the user. If account creation succeeds but session creation fails, a specific safe error tells the user to sign in instead of claiming registration failed.
- `logoutCurrentSession()` deletes the current session. A missing session is treated as an already-completed sign-out.
- `requestPasswordRecovery()` and `completePasswordRecovery()` use Appwrite’s link-based recovery endpoints.

Components never import `Account`, `AppwriteException`, or other SDK classes directly.

### Central state with TanStack Query

`AuthProvider` owns one auth query (`['auth', 'current-user']`) and exposes `useAuth()`:

- The query runs on application startup, restoring the session after refresh.
- A `401` or `user_session_not_found` response is a normal signed-out state.
- Network, configuration, and unexpected Appwrite failures produce an `error` state with a retry screen instead of silently logging the user out.
- Successful login/registration seeds the auth cache.
- Logout clears user-specific query caches, sets the auth cache to `null`, and keeps the provider as the single source of auth state.
- The query uses a five-minute stale time and refetches on window focus, allowing an expired or externally deleted session to be detected gracefully.

No passwords or tokens are written to `localStorage` by application code. The Appwrite SDK manages its own session cookie/fallback behavior.

### Route guards

- `ProtectedRoute` shows a session-check loading screen, redirects unauthenticated users to `/login`, and passes the intended internal destination in router state.
- `PublicOnlyRoute` redirects authenticated users away from login, registration, and recovery request pages.
- `getSafeRedirectPath()` only accepts same-origin internal paths, rejects auth routes, and prevents open redirects.
- Reset-password pages remain reachable while authenticated so a user can complete a recovery link.

Auth pages and the dashboard are lazy-loaded route modules. React Hook Form, the form components, and the authenticated shell are therefore not part of the initial public landing bundle. The Appwrite SDK stays in the shared authentication runtime because session restoration happens at application startup.

These guards are UX controls, not authorization. Backend permissions remain mandatory for private records and files.

### Forms and error handling

- Login, registration, recovery request, and reset forms use React Hook Form with Zod resolvers.
- Schemas enforce email shape, name/email length, Appwrite’s 8–256 password range, matching registration passwords, and matching reset passwords.
- Password fields include an accessible show/hide control that is independent per field.
- `lib/auth-errors.ts` maps Appwrite error types, rate limits, configuration failures, and network errors to safe messages.
- Raw Appwrite messages and stack traces are never displayed.
- Password recovery responses are intentionally generic to avoid account enumeration.

### Password recovery flow

1. `/forgot-password` calls `account.createRecovery()` with the current origin’s `/reset-password` URL.
2. Appwrite sends an email containing `userId` and `secret` query parameters.
3. `/reset-password` calls `account.updateRecovery()` with the new password.
4. The user is redirected to `/login` with a success message.

Appwrite requires the recovery redirect host to be a registered Web platform. Email delivery must also be configured for the Appwrite project.

### Dashboard and profile decision

The authenticated shell uses a fixed desktop sidebar and a collapsible mobile panel. It displays the signed-in Appwrite account’s name, email, and email-verification state, plus a working sign-out action.

The dashboard is intentionally a placeholder. It does not fabricate CV/job/analysis counts or results.

Phase 2 does **not** create persistent `profiles` database rows or editable settings. Those require the database configuration, permissions, and schema work that belong to the data phase. The account data from Appwrite Auth is sufficient for this phase; this limitation is documented rather than hidden.

## Decision: Typed, non-throwing environment validation

`lib/env.ts` defines every public environment variable, validates it with Zod, normalizes the endpoint, and classifies issues as errors or warnings.

Validation deliberately does **not** throw at module load. A thrown error would produce a blank screen when the app is deployed without configuration. Instead:

- Required values are reported on `/diagnostics`.
- Invalid optional resource IDs produce warnings without blocking the current phase.
- The connection check is disabled until the endpoint and project ID are valid.
- The UI can explain exactly which variable is missing and how to fix it.

Only `VITE_*` variables are read. Each variable is referenced explicitly so Vite can statically replace it in production builds; dynamic key lookups would silently drop custom values from the bundle. Vite embeds these values in the browser bundle, so they are treated as public by definition. The project ID validator rejects values longer than 36 characters to reduce the chance of someone pasting a server API key into that field.

### Why the optional IDs are already declared

`VITE_APPWRITE_DATABASE_ID`, bucket IDs, and the analysis Function ID are part of the target architecture and appear in `.env.example`. They are optional in the current phases and are displayed as "Not set — later phase" in diagnostics. No database, bucket, or Function is created or accessed.

## Decision: Diagnostic uses the public ping route

`services/appwrite-health.service.ts` calls `client.ping()` with a 10-second timeout. This:

- Verifies network reachability and CORS from the current origin.
- Sends the configured project header without creating a session.
- Distinguishes project-not-found, rejected origin, timeout, and network failures.
- Does not read user data, open a database, or touch a private bucket.

The check intentionally does not claim that authentication or later resources work. The UI states that limitation.

## Decision: Tailwind CSS 4 Vite integration

Tailwind CSS 4 is configured with the official `@tailwindcss/vite` plugin and a single CSS entry point (`styles/index.css`) using `@import "tailwindcss"`. Design tokens are defined with `@theme`:

- A deep navy/blue `brand` palette.
- System sans-serif and monospace stacks, so no external font request is required.
- Light theme only, matching the current product direction.
- Visible keyboard focus and reduced-motion support.

No second UI component library is installed. Small reusable primitives (`ButtonLink`, `StatusBadge`, `PageHeader`) keep the interface consistent.

## Decision: BrowserRouter

The app uses React Router's `BrowserRouter` with clean URLs (`/`, `/diagnostics`). This matches the planned production routes and Appwrite Sites deployment.

Static hosting must serve `index.html` for unknown client-side routes. If Appwrite Sites does not provide an SPA fallback at deployment time, that behavior must be configured before Phase 8.

## Server state

TanStack Query is configured once in `lib/query-client.ts` and provided at the application root. Defaults are a 30-second stale time, no refetch on window focus, and one retry. The diagnostic query opts out of retries because a configuration error is meaningful and should be shown immediately.

The auth query overrides defaults with no retries, a five-minute stale time, and refetch-on-focus. It is the only server-state owner for authentication. Future resource queries should be keyed by user-scoped identifiers and cleared on logout; the current logout implementation already removes all non-auth query caches.

## Security boundaries

### Browser

- Receives only the public Appwrite endpoint, project ID, and resource IDs.
- Uses the signed-in user’s Appwrite session through the Web SDK; it does not manually persist session tokens.
- Must never receive an Appwrite server API key or the Gemini API key.
- Must not store CV contents or secrets in `localStorage`.
- Treats route guards as navigation UX only. Appwrite permissions and Function ownership checks must enforce access to private data.

### Appwrite Function (later)

- Holds `GEMINI_API_KEY` in server-side environment variables.
- Verifies the caller and ownership of every referenced record and file.
- Retrieves private PDFs with server-side credentials.
- Runs deterministic Python scoring and persists results.
- Uses the narrowest practical API key scopes.

### Repository

- `.env`, `.env.local`, and variants are ignored.
- `.env.example` contains placeholders only.
- The production bundle must be checked for secret leakage before release.

## Deferred architectural decisions

The following are intentionally not decided or implemented yet:

- Persistent `profiles` rows, editable account settings, email-verification UX, and account deletion.
- Exact Appwrite TablesDB column definitions, indexes, and permissions.
- Appwrite Storage bucket settings and file permissions.
- Python Function packaging of `packages/python_core`.
- Gemini model selection and prompt/schema versions.
- Global `401` handling for future resource queries. The auth provider can refresh the session, but future services must trigger that refresh on expired-session errors.
- PDF report design and download flow.
- Appwrite Sites production routing and custom domains.
- Desktop packaging.

These decisions belong to the phases that implement them and should be documented when made.

## Phase 1 acceptance mapping

| Requirement | Implementation |
| --- | --- |
| Monorepo structure | Root docs/config plus standalone `web/` package. |
| React + TypeScript + Vite | Vite 8 React-TS app with strict TypeScript. |
| Tailwind Vite integration | `@tailwindcss/vite` plugin and CSS-first theme. |
| Appwrite Web SDK | Single public client in `lib/appwrite.ts`. |
| Typed environment validation | Zod schema in `lib/env.ts` with UI diagnostics. |
| Responsive shell | Sticky responsive header, skip link, landing page, footer. |
| Connection diagnostic | `/diagnostics` page with public ping and safe error states. |
| Secrets | No server keys; `.env*` ignored; security guidance included. |
| Documentation | Root README, this document, and Appwrite setup guide. |

## Phase 2 acceptance mapping

| Requirement | Implementation |
| --- | --- |
| Registration | `/register` with React Hook Form + Zod, password confirmation, show/hide controls, Appwrite account creation, automatic session. |
| Login | `/login` with Appwrite email/password session. |
| Logout | Sidebar action calls `deleteSession('current')`, clears cached user state. |
| Current user | `getCurrentUser()` maps the Appwrite account to a narrow `AuthUser`. |
| Session restoration | Auth query runs on startup and after refresh. |
| Expired/missing sessions | Treated as signed out; protected routes redirect to login. |
| Central auth state | `AuthProvider` + `useAuth()` backed by TanStack Query. |
| Public/protected routing | `PublicOnlyRoute`, `ProtectedRoute`, guarded dashboard. |
| Intended destination | Router state `from`, validated by `getSafeRedirectPath()`. |
| Loading states | Auth loading screen, pending buttons, session retry screen. |
| Validation/errors | Zod schemas and safe Appwrite error mapping. |
| Password recovery | Link request, reset page, `updateRecovery`, login success message. |
| Application shell | Responsive sidebar/mobile panel, account details, logout, placeholder dashboard. |
| No manual tokens | Appwrite Web SDK owns session persistence. |
| Tests | Node test runner coverage for auth utilities and schemas. |
