# Appwrite Cloud Setup — Phases 1 and 2

This guide covers the manual Appwrite Console steps required for the current web foundation and authentication phase. No Appwrite resources have been created by this repository, and no credentials are stored in it.

The app currently needs:

- An Appwrite Cloud project.
- A Web platform for the local development hostname.
- Email/password authentication enabled.
- The project's public endpoint and project ID in `web/.env.local` or `web/.env`.
- Email delivery configured for password recovery testing.

Do **not** create database tables, storage buckets, or the analysis Function yet. Those belong to later phases.

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

This allows the browser at the local development origin to call Appwrite Auth and the other Appwrite APIs. Production Site and custom domain hostnames must be added later, before deployment.

## 3. Enable email/password authentication

1. Open the project's **Auth** settings.
2. Confirm that **Email/Password** authentication is enabled.
3. Review the project's password policy. The frontend enforces Appwrite's baseline range of 8–256 characters, but Appwrite may apply additional project-level checks such as breached-password detection, personal-data rules, or password history.
4. Review session length and the maximum number of active sessions. The app relies on the session behavior configured for the project; it does not maintain a custom session store.

The frontend uses these Appwrite Account endpoints:

- Create account
- Create email/password session
- Get current account
- Delete the current session
- Create password recovery
- Complete password recovery

## 4. Configure password recovery email

Link-based recovery sends an email and redirects the user back to:

```text
http://<YOUR_DEV_HOST>:<PORT>/reset-password
```

For localhost:

```text
http://localhost:5173/reset-password
```

Requirements:

- The redirect hostname must be registered as an Appwrite Web platform. Appwrite rejects unregistered redirect hosts to prevent open redirects.
- Appwrite must be able to send email. If recovery messages do not arrive, review the project's email/SMTP configuration and spam handling.
- The link is valid for one hour and can be used only once.
- Do not use a production user account for development testing.

The application never displays whether an account exists for a recovery email; the confirmation is intentionally generic.

## 5. Configure the frontend locally

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

Leave the optional database, bucket, and Function IDs unset during Phases 1–2. Do not add any server API key or Gemini key.

Start the app:

```bash
npm run dev
```

Open <http://localhost:5173/diagnostics> and confirm the Appwrite endpoint is reachable. Then open <http://localhost:5173/register> to test account creation.

## 6. Interpret the diagnostic result

The diagnostics page validates the shape of the public values and calls Appwrite's public ping route.

| Result | Meaning | Action |
| --- | --- | --- |
| **Connected** | The endpoint responded and accepted the project header. | Continue to authentication testing. |
| **Project not found** | The endpoint is reachable, but the project ID is not valid there. | Copy the project ID again from Settings and confirm the endpoint region. |
| **Origin rejected / Unreachable** | The browser could not complete the request, commonly because of CORS or an unreachable URL. | Confirm the endpoint URL and add the current hostname as a Web platform. |
| **Timed out** | No response arrived within 10 seconds. | Check your network, endpoint, and Appwrite status. |
| **Not configured** | A required environment variable is missing or invalid. | Follow the setup steps above and restart `npm run dev`. |

A successful ping does not prove that email/password auth is enabled or that recovery email is configured. Verify those with the manual checks below.

## 7. Manual authentication verification

Use a dedicated test account, not a real user's account.

1. Open `/register` and create a test account with a name, email, and password of at least 8 characters.
2. Confirm registration signs the user in and shows the dashboard with the correct name, email, and email-verification status.
3. Refresh `/dashboard`. The session should restore and the dashboard should remain visible.
4. Sign out. Confirm the app returns to `/login` and `/dashboard` is protected again.
5. Sign in with the test credentials. Confirm the dashboard opens.
6. Visit `/dashboard` in a private window. Confirm the app redirects to `/login`, then returns to `/dashboard` after a successful sign-in.
7. While signed in, visit `/login` and `/register`. Confirm the app redirects to `/dashboard`.
8. Submit empty forms and a wrong password. Confirm the app shows safe validation/error messages and no raw Appwrite details.
9. Request a password recovery email from `/forgot-password`. Open the newest link, set a new password, and sign in with it.
10. Clear or invalidate the Appwrite session and refresh `/dashboard`. Confirm the app returns to `/login` cleanly.

If an email/password request fails with `user_auth_method_unsupported`, enable Email/Password in Appwrite Auth settings. If recovery email fails with an SMTP error, configure project email delivery.

## 8. Production Site settings (Phase 8 — do not deploy yet)

When the Site deployment phase begins:

1. Add the Appwrite Site production hostname and any custom domain as Web platforms.
2. Create an Appwrite Site connected to the Git repository.
3. Use these build settings, adapting to the current Console labels:
   - Root directory: `web`
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add the public `VITE_APPWRITE_*` values to the Site build environment.
5. Confirm that client-side routes such as `/login`, `/dashboard`, and `/reset-password` fall back to `index.html`.
6. Recheck the production hostname as a valid recovery redirect origin.

Site and Function environments are configured separately. They do not share variables automatically.

## 9. Later-phase resources — do not create yet

The eventual backend will include:

- Database `cvmatch` with tables for profiles, resumes, jobs, requirements, analyses, matches, recommendations, and reports.
- Private `resumes` and `reports` Storage buckets.
- The `analyze-cv` Python Function.
- The `cvmatch-web` Appwrite Site.

Phase 2 reads account information directly from Appwrite Auth and does not create profile rows. Persistent profile records, ownership permissions, and indexes belong to the data phase.

## 10. Troubleshooting CORS and authentication

A browser CORS failure often appears as a generic network error or `Failed to fetch`.

- Confirm the endpoint begins with `https://` and ends with `/v1`.
- Confirm the current hostname is registered as a Web platform in the correct project.
- If using `127.0.0.1`, register `127.0.0.1`; it is a different origin from `localhost`.
- Use the browser developer tools' Network tab to inspect the failing request and origin.
- After changing platforms, retry; no frontend restart is normally required for Console platform changes.
- If sessions do not persist, verify that the browser allows the Appwrite session cookie and that the project's endpoint/platform configuration matches the app's environment.
- Route guards are not authorization. Future private records and files must also use Appwrite permissions and server-side ownership checks.

## 11. Credential safety

- Never create an Appwrite server API key for use in `web/` or any `VITE_*` variable.
- Never put `GEMINI_API_KEY` in frontend code, `localStorage`, public environment variables, or a desktop package.
- The Gemini key will be configured only as an Appwrite Function server-side secret in the analysis phase.
- If a secret is exposed, rotate it in the provider console and remove it from source history where appropriate.

## References

- Appwrite documentation: <https://appwrite.io/docs>
- Appwrite authentication: <https://appwrite.io/docs/products/auth>
- Email/password authentication: <https://appwrite.io/docs/products/auth/email-password>
- Response codes and error types: <https://appwrite.io/docs/apis/response-codes>
- Appwrite React quick start: <https://appwrite.io/docs/quick-starts/react>
- Appwrite Web SDK quick start: <https://appwrite.io/docs/quick-starts/web>
- Appwrite Sites: <https://appwrite.io/docs/products/sites>
- Appwrite functions: <https://appwrite.io/docs/products/functions>
