# Appwrite Cloud Setup — Phase 1

This guide covers the manual Appwrite Console steps required for Phase 1. No Appwrite resources have been created by this repository, and no credentials are stored in it.

Phase 1 needs only:

- An Appwrite Cloud project.
- A Web platform for the local development hostname.
- The project's public endpoint and project ID in `web/.env.local`.

Do **not** create database tables, storage buckets, or the analysis Function for Phase 1. Those belong to later phases.

## 1. Create an Appwrite Cloud project

1. Sign in at <https://cloud.appwrite.io/console>.
2. Create a project, choosing the region closest to you.
3. Open the project's **Settings** and record:
   - **API endpoint**, for example `https://fra.cloud.appwrite.io/v1`.
   - **Project ID** (a public identifier, not an API key).

The endpoint must include `/v1`.

## 2. Add a Web platform

1. In the project, open the platforms/overview area and choose **Add platform** → **Web app** (the exact label may vary slightly in the current Console).
2. Set the hostname to `localhost`.
3. Enter hostnames only, without a port or path. If you access the app through `127.0.0.1`, add that hostname as a separate Web platform.
4. Save the platform.

This allows the browser at your local development origin to call the Appwrite API. Production Site and custom domain hostnames must be added later, before deployment.

## 3. Configure the frontend locally

From the repository root:

```bash
cd web
cp .env.example .env.local
```

Edit `web/.env.local`:

```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=<APPWRITE_PROJECT_ID>
```

Leave the optional database, bucket, and Function IDs unset during Phase 1. Do not add any server API key or Gemini key.

Start the app:

```bash
npm run dev
```

Open <http://localhost:5173/diagnostics>.

## 4. Interpret the diagnostic result

The page validates the shape of the values and then calls Appwrite's public ping route.

| Result | Meaning | Action |
| --- | --- | --- |
| **Connected** | The endpoint responded and accepted the project header. | Frontend configuration is ready for Phase 2. |
| **Project not found** | The endpoint is reachable, but the project ID is not valid there. | Copy the project ID again from Settings and confirm the endpoint region. |
| **Origin rejected / Unreachable** | The browser could not complete the request, commonly because of CORS or an unreachable URL. | Confirm the endpoint URL and add the current hostname as a Web platform. |
| **Timed out** | No response arrived within 10 seconds. | Check your network, endpoint, and Appwrite status. |
| **Not configured** | A required environment variable is missing or invalid. | Follow the setup steps above and restart `npm run dev`. |

The **Connected** state does not prove that authentication, tables, buckets, or Functions exist. Those are verified in their respective phases.

### If the endpoint is not configured

The app still renders. `/diagnostics` lists each missing or invalid variable and the setup steps. Vite embeds environment values at startup, so restart the dev server after changing `.env.local`.

## 5. Production Site settings (Phase 8 — do not deploy yet)

When the Site deployment phase begins:

1. Add the Appwrite Site production hostname and any custom domain as Web platforms.
2. Create an Appwrite Site connected to the Git repository.
3. Use these build settings, adapting to the current Console labels:
   - Root directory: `web`
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add the public `VITE_APPWRITE_*` values to the Site build environment.
5. Confirm that client-side routes fall back to `index.html`.

Site and Function environments are configured separately. They do not share variables automatically.

## 6. Later-phase resources — do not create yet

The eventual backend will include:

- Database `cvmatch` with tables for profiles, resumes, jobs, requirements, analyses, matches, recommendations, and reports.
- Private `resumes` and `reports` Storage buckets.
- The `analyze-cv` Python Function.
- The `cvmatch-web` Appwrite Site.

Their exact IDs, permissions, indexes, and deployment steps will be documented when those resources are implemented. Keep IDs in environment configuration rather than scattering them through source code.

## 7. Troubleshooting CORS

A browser CORS failure often appears as a generic network error or `Failed to fetch`.

- Confirm the endpoint begins with `https://` and ends with `/v1`.
- Confirm the current hostname is registered as a Web platform in the correct project.
- If using `127.0.0.1`, register `127.0.0.1`; it is a different origin from `localhost`.
- Use the browser developer tools' Network tab to inspect the failing request and origin.
- After changing platforms, retry the check; no frontend restart is normally required for Console platform changes.

## 8. Credential safety

- Never create an Appwrite server API key for use in `web/` or any `VITE_*` variable.
- Never put `GEMINI_API_KEY` in frontend code, `localStorage`, public environment variables, or a desktop package.
- The Gemini key will be configured only as an Appwrite Function server-side secret in the analysis phase.
- If a secret is exposed, rotate it in the provider console and remove it from source history where appropriate.

## References

- Appwrite documentation: <https://appwrite.io/docs>
- Appwrite React quick start: <https://appwrite.io/docs/quick-starts/react>
- Appwrite Web SDK quick start: <https://appwrite.io/docs/quick-starts/web>
- Appwrite Sites: <https://appwrite.io/docs/products/sites>
- Appwrite functions: <https://appwrite.io/docs/products/functions>
