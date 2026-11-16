# Architecture and Phase 1 Decisions

## Context

CVMatch AI is a web-first application backed by Appwrite Cloud. A Python Appwrite Function will later run the trusted analysis pipeline and Gemini calls. A shared Python package will keep scoring logic reusable by the future desktop client. Phase 1 establishes only the repository and frontend foundation.

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

## Decision: Appwrite Web SDK without an auth abstraction yet

The app uses the official `appwrite` Web SDK directly through a single client module (`lib/appwrite.ts`). It does not use the newer `@appwrite.io/react` wrapper.

Rationale:

- `instruction.md` requires the Appwrite Web SDK and a single authentication provider/hook in Phase 2.
- Keeping the client explicit avoids committing to an auth abstraction before the authentication requirements are implemented.
- Server API keys are never present in the browser. The Web SDK is initialized with only the public endpoint and project ID.

The client is exported as `Client | null`. A null client means required configuration is missing; the UI reports that state instead of crashing.

## Decision: Typed, non-throwing environment validation

`lib/env.ts` defines every public environment variable, validates it with Zod, normalizes the endpoint, and classifies issues as errors or warnings.

Validation deliberately does **not** throw at module load. A thrown error would produce a blank screen when the app is deployed without configuration. Instead:

- Required values are reported on `/diagnostics`.
- Invalid optional resource IDs produce warnings without blocking Phase 1.
- The connection check is disabled until the endpoint and project ID are valid.
- The UI can explain exactly which variable is missing and how to fix it.

Only `VITE_*` variables are read. Each variable is referenced explicitly so Vite can statically replace it in production builds; dynamic key lookups would silently drop custom values from the bundle. Vite embeds these values in the browser bundle, so they are treated as public by definition. The project ID validator rejects values longer than 36 characters to reduce the chance of someone pasting a server API key into that field.

### Why the optional IDs are already declared

`VITE_APPWRITE_DATABASE_ID`, bucket IDs, and the analysis Function ID are part of the target architecture and appear in `.env.example`. They are optional in Phase 1 and are displayed as "Not set — later phase" in diagnostics. No database, bucket, or Function is created or accessed.

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

Phase 1 has no authentication or domain data, so there is no client state library beyond React and TanStack Query.

## Security boundaries

### Browser

- Receives only public Appwrite endpoint, project ID, and resource IDs.
- Will use the signed-in user's Appwrite session in Phase 2.
- Must never receive an Appwrite server API key or the Gemini API key.
- Must not store CV contents or secrets in `localStorage`.

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

The following are intentionally not decided or implemented in Phase 1:

- Exact Appwrite TablesDB column definitions, indexes, and permissions.
- Appwrite Storage bucket settings and file permissions.
- Python Function packaging of `packages/python_core`.
- Gemini model selection and prompt/schema versions.
- Authentication provider behaviour and session-expiry UX.
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
