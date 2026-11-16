# CVMatch AI Web App

React + TypeScript + Vite frontend for CVMatch AI. See the [root README](../README.md) for project scope, Ubuntu setup, authentication testing, and security rules.

## Commands

```bash
npm install
cp .env.example .env.local   # then edit the Appwrite endpoint and project ID
npm run dev
```

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite at <http://localhost:5173>. |
| `npm run typecheck` | Run the TypeScript project checks. |
| `npm run lint` | Run Oxlint. |
| `npm test` | Run focused auth utility/schema tests with Node's test runner. |
| `npm run build` | Type-check and build to `dist/`. |
| `npm run preview` | Preview the production build. |

## Configuration

Only public Appwrite project configuration belongs in `.env.local` (or `.env`):

- `VITE_APPWRITE_ENDPOINT` (required)
- `VITE_APPWRITE_PROJECT_ID` (required)
- Optional resource IDs for later phases (database, buckets, analysis Function)

Never add an Appwrite server API key or `GEMINI_API_KEY` to a `VITE_*` variable. Vite embeds those values into the public browser bundle.

The `/diagnostics` route validates the configuration, shows the public settings that are loaded, and performs a public Appwrite ping. It does not create a session or read user data.

## Authentication

- `/register` creates an Appwrite email/password account and starts a session.
- `/login` creates an email/password session.
- `/forgot-password` requests an Appwrite recovery email.
- `/reset-password` completes recovery using the `userId` and `secret` query parameters.
- `/dashboard` is protected by `ProtectedRoute`.

`AuthProvider` owns the current user and session lifecycle through TanStack Query. `useAuth()` is the only auth hook used by components. Appwrite session storage is managed by the Web SDK; this app does not manually store session tokens.

Email/password auth must be enabled in Appwrite Console, and Appwrite must be configured to deliver recovery email. See [Appwrite setup](../docs/appwrite-setup.md) and the manual test checklist in the [root README](../README.md).

## Scope

Phase 2 includes authentication, protected routes, password recovery, the responsive dashboard shell, account display, and logout. CV uploads, database records, AI analysis, reports, and the desktop app are intentionally deferred.

The dashboard is a placeholder and does not include fabricated counts or analysis results. Persistent profile rows and editable settings belong to later phases.
