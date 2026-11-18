# CVMatch AI

CVMatch AI helps a person understand how closely their CV matches a specific job opportunity. It explains which requirements are supported by evidence, where gaps exist, and how a CV can be improved honestly.

**Product truth:** a compatibility score is a weighted measure of evidence in a CV. It is **not** the probability of getting hired, and it must never be presented as one.

**Current status:** Phase 4 is implemented: shared Python core (`packages/python_core/`), byte-level PDF validation, PyMuPDF text extraction, normalization, and structured Pydantic extraction models. Gemini analysis, matching, recommendations, reports, Appwrite Functions, and the desktop client remain intentionally unimplemented for future phases.

> **Backend verification status:** this repository contains no Appwrite provisioning script, server credentials, or live test results. The required database, tables, indexes, permissions, and private bucket must be created manually in Appwrite Console by following [docs/appwrite-setup.md](docs/appwrite-setup.md). No live Appwrite schema or cross-user access test has been verified from this workspace.

## Implemented scope

Phase 1 foundation:

- Monorepo foundation with a standalone Vite web app in `web/`.
- React 19 + TypeScript 7 (strict mode) + Vite 8.
- Tailwind CSS 4 through the official `@tailwindcss/vite` plugin.
- Appwrite Web SDK client configured from public environment variables.
- Typed, Zod-validated environment configuration with clear missing-configuration reporting.
- Responsive public shell, landing page, system-check page, and 404 page.
- Public Appwrite connection diagnostic using the SDK ping route.

Phase 2 authentication:

- Registration with name, email, password, and password confirmation.
- Email/password sign-in and sign-out.
- Session restoration after page refresh.
- Graceful handling of missing and expired Appwrite sessions.
- Password recovery request and password reset pages via Appwrite Account APIs.
- Centralized `AuthProvider` and reusable `useAuth()` hook.
- Protected routes with login redirects and intended-destination preservation.
- Responsive authenticated shell with account information and sign-out.
- React Hook Form + Zod validation with safe, user-friendly error messages.

Phase 3 data and private storage:

- Appwrite TablesDB services for `profiles`, `resumes`, `jobs`, and `job_requirements`.
- A profile row keyed by the authenticated Appwrite user ID, created idempotently on first use and editable from `/settings`.
- Private PDF upload to Appwrite Storage, plus metadata listing and deletion in `/resumes`.
- Browser validation of file extension, MIME type, PDF signature, non-empty file, and the 10 MB limit.
- Generated storage file IDs and private owner-only file permissions; the original filename is sanitized metadata only.
- Job creation, editing, listing, detail review, and deletion with up to 45 requirements per job.
- Atomic job/requirement writes through Appwrite TablesDB client transactions.
- React Query query/mutation hooks with loading, empty, success, retry, and safe error states.
- Responsive dashboard counts loaded from persisted records, with analysis explicitly marked unavailable.
- Appwrite row/file permissions plus browser-side ownership checks as defense in depth.
- Focused tests for permissions, ownership, file validation, sanitization, schemas, input mapping, formatting, and safe errors.

Phase 4 Python core and PDF extraction:

- Reusable Python package `cvmatch_core` under `packages/python_core/`.
- Byte-level validation enforcing PDF signature, 10 MB file size limit, 20-page limit, encryption detection, and corrupt document rejection.
- Page-by-page text extraction with PyMuPDF preserving page numbers and reading structure.
- Deterministic text normalizer handling line endings, consecutive whitespace, excess blank lines, and bullet/email/URL preservation.
- Structured Pydantic v2 extraction models (`ExtractionResult`, `PageResult`, `ExtractionStatus`).
- Safe exception hierarchy with no exposed file paths or stack traces.
- Programmatic synthetic PDF fixtures (zero real personal information in tests).
- 56 automated tests with >90% statement coverage.

Not implemented in Phase 4:

- Gemini API integration, ATS evaluation, scoring, requirement matching, recommendations, or analysis records (Phase 5+).
- Appwrite Functions, PDF reports, or report downloads (Phase 5/7).
- Desktop application (Phase 9).
- OCR (scanned PDFs return `NO_TEXT` status; OCR is deferred per specifications).

## Security and authorization

The frontend uses only public Appwrite configuration. It never contains an Appwrite server API key or Gemini key.

Authentication state relies on the Appwrite Web SDK's session handling. This project does not manually store passwords, API keys, or session tokens in `localStorage`.

Route guards improve the user experience, but they are **not** the security boundary. Phase 3 enforces access through:

- Table-level `create` access for authenticated users only.
- Row Security enabled on every active table.
- Per-row `read`, `update`, and `delete` permissions for the owner's Appwrite user ID.
- A bucket-level `create` permission only, with no bucket-level read/update/delete.
- File Security enabled with per-file owner-only permissions.
- A private bucket with a 10 MB limit and `pdf` as the only allowed extension.
- Rejection of public file URLs by design; the web app never requests a file view/download URL.
- A browser ownership check on returned metadata as an additional guard.

Appwrite remains the authorization boundary. A modified browser client can bypass frontend validation and ownership checks, but it cannot use row/file permissions to read or modify another user's existing records. Phase 4 server-side work must still validate all untrusted inputs and ownership with Appwrite Functions. See [docs/data-model.md](docs/data-model.md) for the threat model, residual risks, and manual security tests.

## Repository layout

```text
.
├── README.md
├── instruction.md
├── .editorconfig
├── .gitignore
├── docs/
│   ├── appwrite-setup.md
│   ├── architecture.md
│   └── data-model.md
└── web/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── public/
    └── src/
        ├── app/          Providers, auth context, routes
        ├── components/   Auth, common, data, dashboard, forms, jobs, layout
        ├── hooks/        Auth, profile, resumes, jobs, diagnostics
        ├── lib/          Appwrite/env config, validation, errors, query keys
        ├── pages/        Public, auth, dashboard, resumes, jobs, settings
        ├── services/     Appwrite Auth, TablesDB, Storage, health checks
        ├── styles/       Tailwind theme and global styles
        ├── types/        Narrow domain and SDK-facing types
        └── utils/        Formatting, redirects, initials
```

The `appwrite/`, `packages/`, `desktop/`, and `scripts/` directories will be added only when their phases begin. Empty placeholder files are intentionally avoided.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Marketing overview. |
| `/login` | Guests only | Email/password sign-in. |
| `/register` | Guests only | Create an Appwrite account. |
| `/forgot-password` | Guests only | Request a password recovery email. |
| `/reset-password` | Public link | Complete a password reset using the email token. |
| `/dashboard` | Protected | Persisted CV/job counts, profile link, and account summary. |
| `/resumes` | Protected | Private CV library with metadata and deletion. |
| `/resumes/new` | Protected | Validate and upload a PDF. |
| `/jobs` | Protected | List saved jobs. |
| `/jobs/new` | Protected | Create a job and its requirements. |
| `/jobs/:jobId` | Protected | View a saved job and requirements. |
| `/jobs/:jobId/edit` | Protected | Edit a job and synchronize requirements. |
| `/settings` | Protected | View account details and edit the persisted profile display name. |
| `/diagnostics` | Public | Validate public configuration and connectivity. |
| `/privacy`, `/terms` | Not yet built | Required before public launch. |

## Prerequisites (Ubuntu)

- **Node.js 22.18 LTS or Node.js 24 or newer** (Node.js 24 LTS recommended). The tests run TypeScript directly through Node's built-in type stripping, which requires Node 22.18 or newer. Check with `node --version`.
- **npm 10+** (bundled with Node.js). Check with `npm --version`.
- **Git**. Check with `git --version`.
- An **Appwrite Cloud** account and project with email/password auth enabled.
- Appwrite TablesDB tables and a private Storage bucket created from the setup guide.
- Python 3.12+ and a Google AI Studio key are only needed in later phases.

If Node.js is not installed, install it with [nvm](https://github.com/nvm-sh/nvm) or your preferred version manager:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# Restart the terminal, then:
nvm install 24
nvm use 24
```

## Local setup

1. Create the Appwrite database, tables, indexes, permissions, and private `resumes` bucket by following [docs/appwrite-setup.md](docs/appwrite-setup.md). Wait for every index to finish building.
2. Install and configure the web app:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>/web
npm install
cp .env.example .env.local
```

3. Edit `web/.env.local` with the public Appwrite identifiers:

```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=<APPWRITE_PROJECT_ID>
VITE_APPWRITE_DATABASE_ID=<DATABASE_ID>
VITE_APPWRITE_RESUMES_BUCKET_ID=<RESUMES_BUCKET_ID>
```

The reports bucket and analysis Function IDs may remain unset until those phases. Do not add an Appwrite server API key or Gemini key.

4. Start the app:

```bash
npm run dev
```

Open <http://localhost:5173>. Register or sign in, then open `/dashboard`. The public configuration check is at `/diagnostics`.

> Vite reads environment files when the dev server starts. Restart `npm run dev` after editing `.env.local` or `.env`.

### Appwrite authentication configuration

In Appwrite Console:

1. Open the project's **Auth → Providers** settings and ensure **Email/Password** authentication is enabled.
2. Add a **Web platform** for `localhost` (and `127.0.0.1` if you use it). Enter the hostname only, without a port.
3. For password recovery, configure email delivery. Link-based recovery sends an email and returns the user to `/reset-password` with `userId` and `secret` query parameters.
4. Ensure the recovery redirect host is allowed by an Appwrite platform. Appwrite rejects redirect URLs whose host is not registered.
5. For production, add the Appwrite Sites domain and any custom domain as Web platforms.

Appwrite Cloud manages sessions through the Web SDK. Do not add a custom token store.

## Environment variables

All frontend variables are public because Vite embeds them in the browser bundle.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_APPWRITE_ENDPOINT` | Yes | Appwrite Cloud API endpoint, including `/v1`. |
| `VITE_APPWRITE_PROJECT_ID` | Yes | Public Appwrite project ID. |
| `VITE_APPWRITE_DATABASE_ID` | Yes for Phase 3 | Database containing the four active tables. |
| `VITE_APPWRITE_RESUMES_BUCKET_ID` | Yes for Phase 3 | Private bucket for PDF files. |
| `VITE_APPWRITE_REPORTS_BUCKET_ID` | Later phase | Private reports bucket used by reporting. |
| `VITE_APPWRITE_ANALYZE_FUNCTION_ID` | Later phase | Analysis Function used by the analysis pipeline. |

Missing Phase 3 IDs do not break public pages or authentication; CV, job, profile, and dashboard data areas show a configuration notice instead.

### Secret rules

- **Never** put `GEMINI_API_KEY`, an Appwrite server API key, or any other secret in a `VITE_*` variable.
- **Never** commit `.env`, `.env.local`, or other environment files. They are ignored by `.gitignore`.
- The Gemini key belongs only in the Appwrite Function's server-side environment.
- A secret that has been exposed in a frontend bundle must be rotated. Removing it from source is not enough.

## Manual verification

Use dedicated test accounts, never real user data.

### Authentication

1. Register a test account and confirm the dashboard opens.
2. Refresh `/dashboard`; the existing session should restore.
3. Sign out, then confirm protected routes redirect to `/login`.
4. Sign in again and confirm the dashboard opens.
5. Request and complete a password recovery email.
6. Try invalid credentials and invalid forms; confirm only safe messages appear.

### Phase 3 data and storage

1. Open `/settings`; a profile row should be created with your account name. Change the display name, save, refresh, and confirm it persists.
2. Upload a valid PDF under 10 MB at `/resumes/new`; confirm it appears in `/resumes` with filename, size, and "Awaiting extraction".
3. Try `.txt`, a renamed non-PDF with a `.pdf` extension, and a file over 10 MB; confirm each is rejected before upload.
4. Delete the CV and confirm the row disappears. In Appwrite Console, confirm the associated private file was removed.
5. Create a job with a title, description, optional company/responsibilities, and at least two requirements.
6. Edit the job, change an existing requirement, add a new one, remove another, and confirm the detail page matches after saving.
7. Delete the job; in Appwrite Console, confirm its requirements were removed too.
8. Sign in as a second test account and confirm it cannot see the first account's CVs, jobs, profile, or counts.
9. Attempt to open the first account's `/jobs/<JOB_ID>` URL while signed in as the second account; confirm the app exposes no job data.
10. Review [docs/data-model.md](docs/data-model.md) for direct SDK security tests that verify row and file permissions rather than UI filtering alone.

These are manual procedures. They have not been executed against a live Appwrite project as part of this workspace state.

## Commands

### Web application (`web/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run typecheck` | Run TypeScript project checks. |
| `npm run lint` | Run Oxlint. |
| `npm test` | Run focused auth and Phase 3 utility/schema tests with Node's built-in test runner. |
| `npm run build` | Type-check and create the production build in `web/dist`. |
| `npm run preview` | Serve the production build locally. |

### Python core (`packages/python_core/`)

| Command | Description |
| --- | --- |
| `pytest packages/python_core/tests -v` | Run the complete automated test suite (56 tests). |
| `ruff check packages/python_core` | Run Ruff linter. |
| `ruff format --check packages/python_core` | Check Ruff code formatting. |

## Production build and Appwrite Sites

```bash
cd web
npm run build
npm run preview
```

The production output is `web/dist`. When deployment begins in a later phase, connect the repository through Appwrite Sites and configure:

- Root directory: `web`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: the same public `VITE_APPWRITE_*` values used locally
- Production Site hostname and any custom domain as Appwrite Web platforms

If direct navigation to a client-side route such as `/dashboard` returns a 404 on a static host, configure the host to fall back to `index.html` for unknown paths.

## Known limitations

- **Live Appwrite resources are unverified.** The repository does not provision tables, indexes, permissions, or buckets, and no configured project was available for end-to-end verification. Follow the setup guide and manual tests before relying on the data layer.
- **No browser or integration test suite.** Automated tests cover pure logic only: permissions, ownership, validation, schemas, mappings, formatting, and error sanitization.
- **PDF page limits and extraction are deferred.** Phase 3 checks extension, MIME type, size, and a PDF signature. It does not detect encrypted/malformed/image-only PDFs or enforce the 20-page limit.
- **No analysis or reports.** No Gemini call, scoring, matching, recommendation, analysis row, report file, or Appwrite Function exists yet.
- **No resume download or preview.** CVs are private metadata records; public or signed file URLs are not exposed in the UI.
- **List caps.** Lists show at most the newest 100 records, and a job supports at most 45 requirements so a full replacement remains below Appwrite Free's 100-operation transaction limit. Pagination is not implemented.
- **No realtime updates.** Changes made in another tab appear after refetch or navigation.
- **Upload cleanup is best-effort.** If metadata creation fails, the app attempts to delete the generated metadata row and the uploaded private file. If cleanup also fails, an unreferenced file or metadata row may remain until an administrator removes it.
- **Client-created rows cannot be fully hardened without a trusted backend.** A malicious authenticated client can bypass UI validation and may create rows with misleading metadata or permissions for its own account. Appwrite row/file permissions prevent access to other users' existing records. Phase 4 must validate all untrusted data in an Appwrite Function. See the residual-risk notes in [docs/data-model.md](docs/data-model.md).
- **Profile name is app-only.** Editing `display_name` does not change the Appwrite Auth account name.
- Password recovery depends on Appwrite project email delivery and registered redirect hosts.
- Session expiry is detected on refresh/window focus and through explicit auth calls. Resource errors show safe messages but do not automatically redirect on a `401`.
- The reports bucket and analysis Function ID are reserved for later phases and are not required now.

## Documentation

- [Phase 4 building manual](docs/phase4.md)
- [Phase 4 implementation notes](docs/phase4-implementation-notes.md)
- [Architecture and phase decisions](docs/architecture.md)
- [Appwrite Cloud setup](docs/appwrite-setup.md)
- [Phase 3 data model, permissions, and security tests](docs/data-model.md)
- [Full project instructions](instruction.md)

## Next phase

Phase 5 implements the Gemini API integration and the server-side Appwrite Function (`analyze-cv`). It consumes `cvmatch_core`, extracts structured profiles from CV text, parses job descriptions, evaluates requirement matching, computes deterministic scores, and saves analysis records.
