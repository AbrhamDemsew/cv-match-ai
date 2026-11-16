# CVMatch AI

CVMatch AI helps a person understand how closely their CV matches a specific job opportunity. It explains which requirements are supported by evidence, where gaps exist, and how a CV can be improved honestly.

**Product truth:** a compatibility score is a weighted measure of evidence in a CV. It is **not** the probability of getting hired, and it must never be presented as one.

**Current status:** Phase 1 — repository and Appwrite foundation only. Authentication, CV uploads, database resources, Gemini analysis, reports, and the desktop client are intentionally not implemented yet.

## Phase 1 scope

Included:

- Monorepo foundation with a standalone Vite web app in `web/`.
- React 19 + TypeScript 7 (strict mode) + Vite 8.
- Tailwind CSS 4 through the official `@tailwindcss/vite` plugin.
- Appwrite Web SDK client configured from public environment variables.
- Typed, validated environment configuration with clear missing-configuration reporting.
- Responsive public shell, landing page, system-check page, and 404 page.
- A public Appwrite connection diagnostic using the SDK ping route.
- Documentation, `.env.example`, and ignore rules for secrets and build output.

Not included in this phase:

- Authentication or registration.
- Database tables or Appwrite Storage buckets.
- Resume uploads or PDF processing.
- Gemini API integration or AI analysis.
- Appwrite Functions.
- Report generation.
- A desktop application.

## Repository layout

```text
.
├── README.md
├── instruction.md
├── .editorconfig
├── .gitignore
├── docs/
│   ├── appwrite-setup.md
│   └── architecture.md
└── web/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── tsconfig.app.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── app/
        │   ├── providers.tsx
        │   └── router.tsx
        ├── components/
        │   ├── common/
        │   ├── diagnostics/
        │   └── layout/
        ├── hooks/
        ├── lib/
        ├── pages/public/
        ├── services/
        ├── styles/
        ├── types/
        ├── App.tsx
        ├── main.tsx
        └── vite-env.d.ts
```

The `appwrite/`, `packages/`, `desktop/`, and `scripts/` directories will be added only when their phases begin. Empty placeholder files are intentionally avoided.

## Prerequisites (Ubuntu)

- **Node.js 20.19+ or 22.12+** (Node.js 24 LTS recommended). Check with `node --version`.
- **npm 10+** (bundled with Node.js). Check with `npm --version`.
- **Git**. Check with `git --version`.
- An **Appwrite Cloud** account for connection diagnostics.
- Python 3.12+ and a Google AI Studio key are only needed in later phases.

If Node.js is not installed, install it with [nvm](https://github.com/nvm-sh/nvm) or your preferred version manager. Example:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# Restart the terminal, then:
nvm install 24
nvm use 24
```

## Local setup

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
cd web
npm install
cp .env.example .env.local
```

Edit `web/.env.local` and set at least:

```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=<APPWRITE_PROJECT_ID>
```

Start the development server:

```bash
npm run dev
```

Open <http://localhost:5173>. The landing page is at `/`; the configuration and connection diagnostic is at `/diagnostics`.

> Vite reads environment files when the dev server starts. Restart `npm run dev` after editing `.env.local`.

### Manual Appwrite setup

Creating the Appwrite Cloud project and Web platform is a Console action; this repository has **not** created any cloud resources or credentials. Follow [docs/appwrite-setup.md](docs/appwrite-setup.md) for the exact steps and troubleshooting.

## Environment variables

All frontend variables are public because Vite embeds them in the browser bundle.

| Variable | Phase 1 | Purpose |
| --- | --- | --- |
| `VITE_APPWRITE_ENDPOINT` | Required | Appwrite Cloud API endpoint, including `/v1`. |
| `VITE_APPWRITE_PROJECT_ID` | Required | Public Appwrite project ID. |
| `VITE_APPWRITE_DATABASE_ID` | Optional | Database ID used from the data phase onward. |
| `VITE_APPWRITE_RESUMES_BUCKET_ID` | Optional | Private resumes bucket used in the storage phase. |
| `VITE_APPWRITE_REPORTS_BUCKET_ID` | Optional | Private reports bucket used in the reporting phase. |
| `VITE_APPWRITE_ANALYZE_FUNCTION_ID` | Optional | Analysis Function used in the analysis phase. |

### Secret rules

- **Never** put `GEMINI_API_KEY`, an Appwrite server API key, or any other secret in a `VITE_*` variable.
- **Never** commit `.env`, `.env.local`, or other environment files. They are ignored by `.gitignore`.
- The Gemini key belongs only in the Appwrite Function's server-side environment.
- A secret that has been exposed in a frontend bundle must be rotated. Removing it from source is not enough.

## Commands

Run these from `web/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run typecheck` | Run TypeScript project checks. |
| `npm run lint` | Run Oxlint. |
| `npm run build` | Type-check and create the production build in `web/dist`. |
| `npm run preview` | Serve the production build locally. |

## Production build and Appwrite Sites

```bash
cd web
npm run build
npm run preview
```

The production output is `web/dist`. When Phase 8 deploys through Appwrite Sites, connect the repository and configure:

- Root directory: `web`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: the same public `VITE_APPWRITE_*` values used locally
- Production Site hostname and any custom domain as Appwrite Web platforms

If direct navigation to a client-side route returns a 404 on a static host, configure the host to fall back to `index.html` for unknown paths.

## Documentation

- [Architecture and decisions](docs/architecture.md)
- [Appwrite Cloud setup](docs/appwrite-setup.md)
- [Full project instructions](instruction.md)

## Next phase

Phase 2 adds Appwrite authentication, session restoration, logout, protected routes, a responsive dashboard layout, and profile records. Phase 1 should be reviewed before Phase 2 begins.
