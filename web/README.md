# CVMatch AI Web App

React + TypeScript + Vite frontend for CVMatch AI. See the [root README](../README.md) for project scope, setup, manual verification, and security rules. Backend provisioning is in [docs/appwrite-setup.md](../docs/appwrite-setup.md), and the Phase 3 schema/security tests are in [docs/data-model.md](../docs/data-model.md).

## Commands

```bash
npm install
cp .env.example .env.local   # then fill in the public Appwrite IDs
npm run dev
```

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite at <http://localhost:5173>. |
| `npm run typecheck` | Run the TypeScript project checks. |
| `npm run lint` | Run Oxlint. |
| `npm test` | Run focused auth and Phase 3 utility/schema tests with Node's built-in test runner. |
| `npm run build` | Type-check and build to `dist/`. |
| `npm run preview` | Preview the production build. |

## Configuration

Only public Appwrite configuration belongs in `.env.local` (or `.env`):

- `VITE_APPWRITE_ENDPOINT` (required for authentication)
- `VITE_APPWRITE_PROJECT_ID` (required for authentication)
- `VITE_APPWRITE_DATABASE_ID` (required for Phase 3 data)
- `VITE_APPWRITE_RESUMES_BUCKET_ID` (required for private CV uploads)
- Optional later-phase IDs: reports bucket and analysis Function

Never add an Appwrite server API key or `GEMINI_API_KEY` to a `VITE_*` variable. Vite embeds every `VITE_*` value into the browser bundle. Restart the dev server after changing environment values.

## Scope

Implemented: auth, protected shell, profiles, private CV metadata/upload/delete, job/requirement CRUD, dashboard counts, and diagnostics.

Not implemented: PDF text/page extraction, OCR, Gemini, analysis, matching, recommendations, reports, Functions, and the desktop client. See [docs/architecture.md](../docs/architecture.md) for the detailed design.

Live Appwrite tables, bucket, permissions, transactions, and cross-user isolation have not been verified from this repository yet. Follow the setup and security-test procedures before treating the data layer as production-ready.
