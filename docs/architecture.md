# Architecture and Phase Decisions

## Context

CVMatch AI is a web-first application backed by Appwrite Cloud. A Python Appwrite Function will later run the trusted analysis pipeline and Gemini calls. A shared Python package will keep scoring logic reusable by the future desktop client.

Phases 1–4 are implemented:

1. Repository and public web foundation.
2. Authentication, protected routing, and the authenticated shell.
3. Persistent profiles, private PDF storage, and job/requirement records.
4. Python core package (`cvmatch_core`) for PDF validation, extraction, normalization, and structured models.

The code and pure-logic tests for these phases are implemented. Live Appwrite resources have not been provisioned or verified from this workspace; see [`data-model.md`](data-model.md) for the outstanding functional and security acceptance checks.

PDF extraction, analysis, matching, reports, Functions, and the desktop client remain later-phase work. The full product and engineering requirements are in [`instruction.md`](../instruction.md).

## Repository shape

The project is a monorepo with independent technology boundaries:

- `web/` — React, TypeScript, Vite, Tailwind CSS, Appwrite Web SDK.
- `docs/` — architecture, Appwrite setup, data model, and security guidance.
- `appwrite/` — future Appwrite Function and configuration.
- `packages/python_core/` — future shared Python domain logic.
- `desktop/` — future PySide6 client.

Empty placeholder directories are not created for future phases.

### Why `web/` is a standalone package

There is no root `package.json` or npm workspace yet. The web app is the only JavaScript package, and Appwrite Sites expects a root directory, install command, build command, and output directory. A root workspace can be introduced later if shared TypeScript packages appear.

## Frontend structure

```text
web/src/
├── app/          Providers, auth context, route composition
├── components/   Auth, common, data, dashboard, forms, jobs, layout
├── hooks/        Auth and React Query resource hooks
├── lib/          Appwrite/env config, domain rules, validation, errors
├── pages/        Public, auth, dashboard, resumes, jobs, settings
├── services/     Appwrite Auth, TablesDB, Storage, and health calls
├── styles/       Tailwind CSS and design tokens
├── types/        Narrow domain and SDK-facing types
├── utils/        Formatting, redirects, initials
├── App.tsx
└── main.tsx
```

### Responsibilities

- **Pages** compose sections and own route-level interaction state, but stay thin.
- **Components** are small, accessible presentational and form units.
- **Hooks** wrap TanStack Query mutations/queries and expose safe UI state.
- **Services** contain all Appwrite SDK calls. Components and hooks do not import TablesDB or Storage directly.
- **lib** holds configuration, validation, domain constants, safe errors, and SDK-permission builders.
- **types** contains narrow domain objects consumed by the UI; Appwrite row shapes stay in services and validation modules.

## Decision: Appwrite Web SDK with a central auth provider

The app uses the official `appwrite` Web SDK through a single client module (`lib/appwrite.ts`). It does not use the newer `@appwrite.io/react` wrapper.

Rationale:

- `instruction.md` requires the Appwrite Web SDK and a single authentication provider/hook.
- Keeping the client explicit avoids hiding session and error behavior behind another abstraction.
- Server API keys are never present in the browser. The Web SDK is initialized with only the public endpoint and project ID.

The client is exported as `Client | null`. A null client means required configuration is missing; the UI reports that state instead of crashing.

## Authentication architecture

### Service boundary

All Appwrite Account calls live in `services/auth.service.ts`:

- `getCurrentUser()` restores the current session and maps the Appwrite user to a narrow `AuthUser`.
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
- Successful login/registration seed the auth cache.
- Logout removes all non-auth query caches, sets the auth cache to `null`, and keeps the provider as the single source of auth state.
- The query uses a five-minute stale time and refetches on window focus, allowing an expired or externally deleted session to be detected gracefully.

No passwords or tokens are written to `localStorage` by application code. The Appwrite SDK manages its own session cookie/fallback behavior.

### Route guards

- `ProtectedRoute` shows a session-check loading screen, redirects unauthenticated users to `/login`, and passes the intended internal destination in router state.
- `PublicOnlyRoute` redirects authenticated users away from login, registration, and recovery request pages.
- `getSafeRedirectPath()` only accepts same-origin internal paths, rejects auth routes, and prevents open redirects.
- Reset-password pages remain reachable while authenticated so a user can complete a recovery link.

These guards are UX controls, not authorization. Appwrite permissions remain mandatory for private records and files.

## Decision: typed, non-throwing environment validation

`lib/env.ts` defines every public environment variable, validates it with Zod, normalizes the endpoint, and classifies issues as errors or warnings.

Validation deliberately does **not** throw at module load. A thrown error would produce a blank screen when the app is deployed without configuration. Instead:

- Public pages and authentication still work when Phase 3 resource IDs are missing.
- `environment.isConfigured` means the endpoint and project ID needed for authentication are valid.
- `environment.isDataConfigured` means the endpoint, project ID, database ID, and resumes bucket ID are all present for Phase 3 data features.
- The connection check is disabled until the endpoint and project ID are valid.
- Data pages show a configuration notice rather than firing doomed Appwrite calls when `isDataConfigured` is false.
- `/diagnostics` explains every missing or malformed value.

Only `VITE_*` variables are read. Each variable is referenced explicitly so Vite can statically replace it in production builds. Vite embeds these values in the browser bundle, so they are treated as public by definition. The public identifier validators reject values longer than 36 characters and reject non-ID characters, reducing the chance of pasting a server API key or an unfilled placeholder into a resource field.

## Decision: TablesDB with a narrow service layer

Phase 3 uses Appwrite TablesDB for structured records and Appwrite Storage for PDF bytes. The active table IDs are centralized in `lib/data-config.ts` and must match Appwrite Console:

- `profiles`
- `resumes`
- `jobs`
- `job_requirements`

Detailed columns, indexes, and permissions live in [`data-model.md`](data-model.md) and [`appwrite-setup.md`](appwrite-setup.md). The frontend never creates tables, columns, indexes, or buckets.

### Active data ownership model

- A profile row uses the authenticated Appwrite user ID as its row ID. `getOrCreateProfile()` is idempotent and re-reads on a create conflict.
- Other owned rows use generated IDs and an indexed `user_id` reference.
- Jobs and their requirements are linked by an indexed `job_id` varchar reference.
- Reference columns are deliberate in Phase 3. Appwrite relationship columns would add cascade and permission behavior that has not been verified against the installed SDK/project, while the current atomic operations and ownership checks can be implemented and tested at the service boundary.
- Future tables (`analyses`, `requirement_matches`, `recommendations`, `reports`) are documented but not created or used.

### Timestamps and IDs

- `created_at` and `updated_at` map to Appwrite’s built-in `$createdAt` and `$updatedAt`. Duplicate custom timestamp columns are intentionally avoided.
- Generated row/file IDs use the SDK’s `ID.unique()`.
- The original CV filename is stored as sanitized display metadata. It is never used as a storage path or file ID.
- Resume `extraction_status` starts as `pending`; `page_count` remains null until Phase 4.
- Job/requirement order uses Appwrite system creation timestamps.

### Transactions and limits

`jobs.service.ts` uses Appwrite TablesDB client transactions for job plus requirement changes:

- Create: insert the job and all submitted requirements in one transaction.
- Update: verify submitted requirement IDs belong to the fetched job, update kept rows, create new rows, delete removed rows, and commit atomically.
- Delete: delete requirements and the job together.
- On a staging or commit failure, the service attempts a rollback and preserves the original safe error.

A job may contain at most **45** requirements. Replacing a full job can stage one job update, up to 45 requirement creates, and up to 45 deletes: 91 operations, below Appwrite Free’s 100-operation transaction limit. The UI and Zod schema enforce the same cap.

### Service and hook boundaries

| Resource | Service | Hook | Cache key |
| --- | --- | --- | --- |
| Profile | `profile.service.ts` | `use-profile.ts` | `['profile', userId]` |
| Resumes | `resumes.service.ts` | `use-resumes.ts` | `['resumes', userId]` |
| Job list | `jobs.service.ts` | `use-jobs.ts` | `['jobs', userId]` |
| Job detail | `jobs.service.ts` | `use-jobs.ts` | `['jobs', userId, jobId]` |

- Services validate Appwrite rows with Zod before returning narrow domain objects.
- Queries are enabled only when a user and `isDataConfigured` are present.
- User-specific cache keys are removed on logout.
- Successful mutations invalidate the affected list/detail keys.
- Lists fetch at most the newest 100 rows; the UI states this limit. Pagination is deferred.

### Error handling

`lib/data-errors.ts` defines safe domain errors and maps Appwrite/network/Storage failures to user-facing messages. Raw provider messages, SQL details, and stack traces are never rendered. Components catch mutation errors, display them in alerts, and keep retryable state where possible.

## Decision: private CV lifecycle

Upload sequence:

1. Validate extension, MIME type, non-empty file size, size ≤ 10 MiB, and a `%PDF-` signature in the browser.
2. Generate a Storage file ID and upload the PDF to the private `resumes` bucket with owner read/update/delete permissions.
3. Create the `resumes` metadata row with the owner’s `user_id`, generated file ID, original filename metadata, size, MIME type, `pending` extraction status, and owner row permissions.
4. If metadata creation fails, attempt to delete the generated metadata row and the uploaded file, then return a safe upload error.

Delete sequence:

1. Read and validate ownership of the metadata row.
2. Delete the private Storage file first. A missing file is treated as already removed.
3. Delete the metadata row. If this fails after file deletion, return a specific retryable error rather than hiding the partial cleanup.

The app never requests a public file URL, `getFileView`, or `getFileDownload`. Private files are not rendered in the browser in Phase 3.

## Decision: profile lifecycle and dashboard truthfulness

The `profiles` row is created lazily by the authenticated shell or settings page rather than during registration. This keeps registration resilient if the database is temporarily unavailable and avoids leaving an account half-created when auth succeeds but data setup fails.

Editing the profile changes only the app-level display name. The Appwrite Auth account name is not mutated in Phase 3.

Dashboard counts come from persisted records and display an em dash or loading indicator instead of fabricated values when configuration, loading, or an error prevents an accurate count. Analysis is explicitly shown as unavailable.

## Decision: diagnostics use the public ping route

`services/appwrite-health.service.ts` calls `client.ping()` with a 10-second timeout. This:

- Verifies network reachability and CORS from the current origin.
- Sends the configured project header without creating a session.
- Distinguishes project-not-found, rejected origin, timeout, and network failures.
- Does not read user data, open a database, or touch a private bucket.

The check intentionally does not claim that authentication, table permissions, indexes, or Phase 3 resources work. The UI states that limitation.

## Decision: Tailwind CSS 4 Vite integration

Tailwind CSS 4 is configured with the official `@tailwindcss/vite` plugin and a single CSS entry point (`styles/index.css`) using `@import "tailwindcss"`. Design tokens are defined with `@theme`:

- A deep navy/blue `brand` palette.
- System sans-serif and monospace stacks, so no external font request is required.
- Light theme only, matching the current product direction.
- Visible keyboard focus and reduced-motion support.

No second UI component library is installed. Small reusable primitives (`Button`, `ButtonLink`, `StatusBadge`, `PageHeader`, `EmptyState`, `LoadingCards`, `ConfirmDialog`, form fields) keep the interface consistent.

## Decision: BrowserRouter

The app uses React Router's `BrowserRouter` with clean URLs. Static hosting must serve `index.html` for unknown client-side routes. If Appwrite Sites does not provide an SPA fallback at deployment time, that behavior must be configured before deployment.

## Server state

TanStack Query is configured once in `lib/query-client.ts` and provided at the application root. Defaults are a 30-second stale time, no refetch on window focus, and one retry. The diagnostic query opts out of retries because a configuration error is meaningful and should be shown immediately.

The auth query overrides defaults with no retries, a five-minute stale time, and refetch-on-focus. It is the only server-state owner for authentication. Resource hooks add user-scoped keys, enablement checks, safe error mapping, and mutations that invalidate the correct caches. Logout removes all non-auth caches.

## Security boundaries

### Browser

- Receives only the public Appwrite endpoint, project ID, database ID, bucket IDs, and Function ID.
- Uses the signed-in user’s Appwrite session through the Web SDK; it does not manually persist session tokens.
- Never receives an Appwrite server API key or the Gemini API key.
- Does not store CV contents or secrets in `localStorage`.
- Treats route guards as navigation UX only.
- Sends explicit owner-only row/file permissions on create.
- Re-checks `user_id`/row-ID ownership on returned metadata as defense in depth.
- Never relies on frontend filtering as authorization.

### Appwrite

- Every active table enables Row Security and grants only `create` to authenticated users at table level.
- Table-level read/update/delete are not granted to users.
- Each row grants `read`, `update`, and `delete` only to its owner’s user ID.
- The resumes bucket grants only `create` at bucket level, enables File Security, and grants no public read access.
- Each file grants `read`, `update`, and `delete` only to its owner’s user ID.
- CV files are private and never served through a public URL.
- Indexes support owner-scoped list queries.

### Appwrite Function (later)

- Holds `GEMINI_API_KEY` in server-side environment variables.
- Verifies the caller and ownership of every referenced record and file.
- Retrieves private PDFs with server-side credentials.
- Validates untrusted job/profile/PDF data server-side.
- Runs deterministic PDF extraction and Python scoring.
- Persists analyses, matches, recommendations, and reports with the narrowest practical API key scopes.

### Repository

- `.env`, `.env.local`, and variants are ignored.
- `.env.example` contains blank values and example comments, never real identifiers or secrets.
- The production bundle should be checked for secret leakage before release.

### Residual risk

Appwrite client SDKs allow authenticated users to create rows/files with explicit permissions. The app always requests owner-only permissions, but a modified client can bypass the UI and create misleading rows for its own account. It cannot use those permissions to read or modify another user’s existing records. Trusted server-side writes will be required if this threat becomes material. See [`data-model.md`](data-model.md).

## Deferred architectural decisions

The following are intentionally not decided or implemented yet:

- Server-side ownership and input validation inside Appwrite Functions (Phase 5).
- Analyses, requirement matching, scoring, recommendations, and report design (Phases 5-7).
- Gemini model selection, prompt/schema versions, and scoring versions (Phase 5).
- Reports bucket provisioning and report download flow (Phase 7).
- Global automatic `401` redirect/refresh behavior for resource queries.
- Pagination, search, realtime updates, account deletion, email change, and profile/auth-name synchronization.
- Appwrite Sites production routing, custom domains, and deployment (Phase 8).
- Desktop packaging (Phase 9).

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
| Documentation | Root README, architecture, setup, and data-model docs. |

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
| Application shell | Responsive sidebar/mobile panel, account details, logout. |
| No manual tokens | Appwrite Web SDK owns session persistence. |
| Tests | Node test runner coverage for auth utilities and schemas. |

## Phase 3 acceptance mapping

| Requirement | Implementation |
| --- | --- |
| Database and tables | Four active TablesDB tables documented and consumed; manual Console provisioning is required. |
| Indexes and permissions | Owner lookup indexes; Row Security; create-only table grants; owner row permissions. |
| Private storage | Private `resumes` bucket, file security, 10 MB/`pdf` bucket restrictions; no public URLs. |
| CV upload/list/metadata/delete | `/resumes/new` and `/resumes`, validation, private upload, metadata rows, retryable deletion. |
| Job CRUD | `/jobs`, `/jobs/new`, detail, edit, delete with atomic requirement synchronization. |
| Profile retrieval/creation/update | Lazy idempotent profile creation, dashboard/sidebar read, `/settings` update. |
| Ownership | Appwrite row/file permissions plus browser defense-in-depth checks. |
| UI states | Loading cards, empty states, success notices, retryable safe error states, configuration notices. |
| React Query consistency | User-scoped query keys, enablement checks, invalidations, logout cache removal. |
| Strict TypeScript | Explicit row validation and narrow domain types under strict mode. |
| Tests | Pure-logic tests for permissions, ownership, files, schemas, mappings, formatting, and errors. |
| Documentation | README, setup guide, architecture, and data-model/security guide updated. |
| Live verification | **Not performed** in this workspace; manual functional and security procedures are documented. |

## Phase 4 acceptance mapping

| Requirement | Implementation |
| --- | --- |
| Package structure | Isolated, clean `packages/python_core/` with `pyproject.toml` and Hatchling backend. |
| Dependencies | Minimal footprint: `pymupdf>=1.24.0,<2.0.0` (pinned to stable 1.x without heavy ML dependencies) and `pydantic>=2.7.0`. |
| PDF byte validation | Byte-level signature check, size limit (10 MB), page limit (20), encryption detection, and corrupt document rejection. |
| PDF text extraction | Page-by-page PyMuPDF extraction, sequential page numbering, text availability detection, and safe resource cleanup. |
| Text normalization | Deterministic line-ending unification, whitespace collapsing, excess blank line truncation, and full content preservation. |
| Structured models | Pydantic v2 `ExtractionResult`, `PageResult`, and `ExtractionStatus` (`SUCCESS`, `NO_TEXT`, `FAILED`). |
| Predictable errors | Safe exception hierarchy inheriting from `CVMatchCoreError` with no leaked filesystem paths or stack traces. |
| Privacy and security | In-memory synthetic test fixtures only; no real CVs or PII; no permanent file writes or external calls. |
| Automated testing | 56 pytest tests covering models, normalizer, validator, and extractor with >90% code coverage. |
| Code quality | Ruff formatting and linting pass with zero errors. |
