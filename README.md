# CVMatch AI

CVMatch AI helps a person understand how closely their CV matches a specific job opportunity. It explains which requirements are supported by evidence, where gaps exist, and how a CV can be improved honestly.

**Product truth:** a compatibility score is a weighted measure of evidence in a CV. It is **not** the probability of getting hired, and it must never be presented as one.

**Current status:** Phase 2 — authentication and the authenticated application shell are implemented. CV uploads, database records for jobs/resumes/analyses, Gemini analysis, reports, functions, and the desktop client remain intentionally unimplemented.

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
- Redirects for authenticated users away from login, registration, and recovery pages.
- Responsive dashboard shell with account information and sign-out.
- React Hook Form + Zod validation with safe, user-friendly Appwrite error messages.
- Focused tests for auth error mapping, redirect safety, initials, and form schemas.

Not implemented in Phase 2:

- CV uploads or PDF processing.
- Database tables for resumes, jobs, analyses, requirement matches, recommendations, or reports.
- Persistent profile rows or editable account settings.
- Gemini API integration, scoring, ATS evaluation, or recommendations.
- Appwrite Functions.
- PDF reports or report downloads.
- Desktop application.

## Security and authorization

The frontend uses only public Appwrite configuration. It never contains an Appwrite server API key or Gemini key.

Authentication state relies on the Appwrite Web SDK's session handling. This project does not manually store passwords, API keys, or session tokens in `localStorage`.

Route guards improve the user experience, but they are **not** the security boundary. In later phases, every CV, job, analysis, and report must also be protected by:

- Appwrite row/file permissions scoped to the signed-in user.
- Ownership checks inside Appwrite Functions.
- Private Storage buckets with no public read access.
- Server-side identity verification based on the authenticated Appwrite context, never a browser-supplied user ID.

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
        │   ├── auth-context.ts
        │   ├── auth-provider.tsx
        │   ├── providers.tsx
        │   └── router.tsx
        ├── components/
        │   ├── auth/
        │   ├── common/
        │   ├── dashboard/
        │   ├── diagnostics/
        │   ├── forms/
        │   ├── layout/
        │   └── routing/
        ├── hooks/
        ├── lib/
        │   ├── validation/
        │   └── ...
        ├── pages/
        │   ├── auth/
        │   ├── dashboard/
        │   └── public/
        ├── services/
        ├── styles/
        ├── types/
        ├── utils/
        ├── App.tsx
        ├── main.tsx
        └── vite-env.d.ts
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
| `/dashboard` | Protected | Authenticated account and workspace placeholder. |
| `/diagnostics` | Public | Validate public Appwrite configuration and connectivity. |
| `/privacy`, `/terms` | Not yet built | Required before public launch. |

## Prerequisites (Ubuntu)

- **Node.js 20.19+ or 22.12+** (Node.js 24 LTS recommended). Check with `node --version`.
- **npm 10+** (bundled with Node.js). Check with `npm --version`.
- **Git**. Check with `git --version`.
- An **Appwrite Cloud** account and project.
- Python 3.12+ and a Google AI Studio key are only needed in later phases.

If Node.js is not installed, install it with [nvm](https://github.com/nvm-sh/nvm) or your preferred version manager:

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

Open <http://localhost:5173>. The landing page is at `/`; register or sign in to open `/dashboard`; the configuration diagnostic is at `/diagnostics`.

> Vite reads environment files when the dev server starts. Restart `npm run dev` after editing `.env.local` or `.env`.

### Appwrite authentication configuration

In Appwrite Console:

1. Open the project's **Auth** settings and ensure **Email/Password** authentication is enabled.
2. Add a **Web platform** for `localhost` (and `127.0.0.1` if you use it). Enter the hostname only, without a port.
3. For password recovery, configure email delivery for the project. Link-based recovery sends an email and returns the user to `/reset-password` with `userId` and `secret` query parameters.
4. Ensure the recovery redirect host is allowed by an Appwrite platform. Appwrite rejects redirect URLs whose host is not registered.
5. For production, add the Appwrite Sites domain and any custom domain as Web platforms.

Appwrite Cloud manages sessions through the Web SDK. Do not add a custom token store.

Follow [docs/appwrite-setup.md](docs/appwrite-setup.md) for detailed Console steps and troubleshooting.

## Environment variables

All frontend variables are public because Vite embeds them in the browser bundle.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_APPWRITE_ENDPOINT` | Yes | Appwrite Cloud API endpoint, including `/v1`. |
| `VITE_APPWRITE_PROJECT_ID` | Yes | Public Appwrite project ID. |
| `VITE_APPWRITE_DATABASE_ID` | Later phase | Database ID used from the data phase onward. |
| `VITE_APPWRITE_RESUMES_BUCKET_ID` | Later phase | Private resumes bucket used in the storage phase. |
| `VITE_APPWRITE_REPORTS_BUCKET_ID` | Later phase | Private reports bucket used in the reporting phase. |
| `VITE_APPWRITE_ANALYZE_FUNCTION_ID` | Later phase | Analysis Function used in the analysis phase. |

### Secret rules

- **Never** put `GEMINI_API_KEY`, an Appwrite server API key, or any other secret in a `VITE_*` variable.
- **Never** commit `.env`, `.env.local`, or other environment files. They are ignored by `.gitignore`.
- The Gemini key belongs only in the Appwrite Function's server-side environment.
- A secret that has been exposed in a frontend bundle must be rotated. Removing it from source is not enough.

## Manual authentication test checklist

Use a dedicated test account, not a real user's data.

1. **Registration:** open `/register`, enter a name, valid email, a password of at least 8 characters, and the same password in **Confirm password**. Use the eye buttons to check either password. Confirm you land on `/dashboard` and the sidebar shows the account name and email.
2. **Refresh persistence:** refresh `/dashboard`. A loading state should appear briefly, then the dashboard should remain visible without signing in again.
3. **Logout:** click **Sign out** in the sidebar. Confirm you are returned to `/login` with a signed-out message and `/dashboard` is no longer accessible.
4. **Login:** sign in with the test account. Confirm the dashboard opens.
5. **Protected route redirect:** open a private/incognito window and visit `/dashboard`. You should be redirected to `/login`; after signing in, you should be returned to `/dashboard`.
6. **Guest-only redirect:** while signed in, visit `/login` or `/register`. You should be redirected to `/dashboard`.
7. **Client validation:** submit empty or invalid login/registration forms. Confirm inline messages appear and no request is sent for invalid input.
8. **Invalid credentials:** try a wrong password. Confirm a friendly message appears and no technical error details are shown.
9. **Session expiry:** end the session in Appwrite Console or clear Appwrite cookies, then refresh `/dashboard`. You should be redirected to `/login` rather than seeing a broken page.
10. **Password recovery:** open `/forgot-password`, request a recovery email, open the newest link, choose a new password, and sign in with it. Email delivery must be configured in Appwrite for this step.
11. **Missing configuration:** temporarily point the app at missing environment values in a separate copy or use `/diagnostics`; auth forms should explain that configuration is required instead of failing silently.

## Commands

Run these from `web/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run typecheck` | Run TypeScript project checks. |
| `npm run lint` | Run Oxlint. |
| `npm test` | Run focused auth utility and schema tests with Node's built-in test runner. |
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

If direct navigation to a client-side route such as `/dashboard` returns a 404 on a static host, configure the host to fall back to `index.html` for unknown paths.

## Known limitations

- **Persistent profile records are deferred.** The dashboard reads the authenticated Appwrite account directly. The `profiles` table, editable settings, and account deletion belong to later data/settings work.
- Password recovery depends on Appwrite project email delivery and registered redirect hosts.
- Session expiry is detected on refresh/window focus and through explicit auth calls. Later API modules should react to `401` responses by refreshing the auth state.
- The dashboard is intentionally a placeholder. It does not show fabricated CV, job, or analysis counts.
- Route guards are not sufficient authorization for later private data. Appwrite permissions and Function checks remain mandatory.
- Auth pages and the dashboard are route-level code-split, keeping the public landing bundle smaller. The Appwrite SDK remains part of the shared authentication runtime and can be optimized further if needed.
- Automated tests cover pure auth utilities and schemas. Full browser auth flows require a configured Appwrite project and a test account.

## Documentation

- [Architecture and decisions](docs/architecture.md)
- [Appwrite Cloud setup](docs/appwrite-setup.md)
- [Full project instructions](instruction.md)

## Next phase

Phase 3 adds the Appwrite database, profile rows, private CV/report Storage buckets, CV upload/list/delete, and job record creation/editing/listing/deletion with ownership permissions. Phase 2 should be reviewed before Phase 3 begins.
