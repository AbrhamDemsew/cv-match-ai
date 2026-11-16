# CVMatch AI Web App

React + TypeScript + Vite frontend for CVMatch AI. See the [root README](../README.md) for project scope, Ubuntu setup, and security rules.

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
| `npm run build` | Type-check and build to `dist/`. |
| `npm run preview` | Preview the production build. |

## Configuration

Only public Appwrite project configuration belongs in `.env.local`:

- `VITE_APPWRITE_ENDPOINT` (required in Phase 1)
- `VITE_APPWRITE_PROJECT_ID` (required in Phase 1)
- Optional resource IDs for later phases (database, buckets, analysis Function)

Never add an Appwrite server API key or `GEMINI_API_KEY` to a `VITE_*` variable. Vite embeds those values into the public browser bundle.

The `/diagnostics` route validates the configuration, shows the public settings that are loaded, and performs a public Appwrite ping. It does not create a session or read user data.

## Scope

Phase 1 contains the responsive public shell, landing page, system-check page, and 404 page. Authentication, data access, uploads, AI analysis, and reports are intentionally deferred. See [docs/architecture.md](../docs/architecture.md) and [docs/appwrite-setup.md](../docs/appwrite-setup.md).
