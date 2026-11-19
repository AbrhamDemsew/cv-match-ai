# Appwrite Cloud Setup — Phases 1–3

This guide describes the **manual** Appwrite Cloud Console setup required by the current web application: authentication, four TablesDB tables, their indexes and permissions, and one private Storage bucket.

> **Verification status:** the repository contains no provisioning script, API key, or live test results. These steps have **not** been executed against a configured Appwrite project as part of this workspace state. Complete them in a dedicated development project and run the checks in [data-model.md](data-model.md#manual-security-testing) before trusting the data layer.

## What the app needs

- An Appwrite Cloud project.
- A Web platform for the local development hostname.
- Email/password authentication enabled.
- Anonymous sessions reviewed and disabled where the project/Console offers a toggle.
- Public endpoint and project ID values.
- A database containing `profiles`, `resumes`, `jobs`, and `job_requirements`.
- Row Security enabled and owner-scoped row permissions on every active table.
- Owner lookup indexes on `user_id` and `job_id`.
- A private `resumes` bucket with File Security, a 10 MB limit, and only the `pdf` extension allowed.
- Public database ID and resumes bucket ID values.

The `analyses`, `requirement_matches`, `recommendations`, and `reports` tables and the reports bucket are **not required** for Phase 3. Do not create the analysis Function yet.

## 1. Create an Appwrite Cloud project

1. Sign in at <https://cloud.appwrite.io/console>.
2. Create a project in the region closest to you.
3. Open **Project Settings** and record:
   - **API endpoint**, for example `https://fra.cloud.appwrite.io/v1`.
   - **Project ID**, a public identifier. This is not an API key.

The endpoint must include `/v1`.

## 2. Add a Web platform

1. Open **Project Settings → Platforms** (wording may vary by Console version).
2. Add a **Web** platform.
3. Enter `localhost` as the hostname. Do **not** include a protocol, path, or port.
4. Add `127.0.0.1` too if you open the dev server through that hostname.
5. For deployed environments, add the Appwrite Sites hostname and any custom domain.

Appwrite checks the browser `Origin` against registered Web platforms. Missing platform entries cause browser CORS or “origin not allowed” failures even when the endpoint is correct.

## 3. Configure authentication

1. Open **Auth → Providers** and enable **Email/Password**.
2. Restrict other sign-in providers to what the product actually uses. If this Appwrite project/Console version provides a toggle for **anonymous sessions**, disable it: the table/bucket `Users` role also covers anonymous accounts. The app never creates anonymous sessions, but if they are available, a guest could create its own rows/files under the `Users` create grants.
3. Configure project email delivery for password recovery. Depending on the Appwrite Cloud plan and Console version, this may use Appwrite's email service or a custom SMTP/provider; recovery emails will not arrive until email delivery works.
4. Recovery uses a link back to `/reset-password` with `userId` and `secret` query parameters. The redirect host must be a registered Web platform.
5. For local testing, use a test mailbox you control. Do not use production credentials.

The web app does not implement email-verification enforcement, custom SMTP setup, OAuth providers, passkeys, magic links, or multi-factor authentication in Phases 1–3.

## 4. Create the database

1. Open **Databases** and create a database.
2. Use a clear name such as `CVMatch`.
3. Set an ID you can reference from the frontend, for example `cvmatch`. Appwrite custom IDs are at most 36 characters and may contain letters, digits, periods, hyphens, and underscores; they cannot start with a special character.
4. Record the ID for `VITE_APPWRITE_DATABASE_ID`.

Table IDs are not configurable in this implementation. Create them exactly as named below: `profiles`, `resumes`, `jobs`, and `job_requirements`.

## 5. Create the four active tables

For every table:

1. Open the database and choose **Create table**.
2. Use the exact table ID shown.
3. Create the columns listed.
4. Open the table's **Settings → Row security** and enable **Row Security**. Row-level permissions are ignored while this is off.
5. In the table's **Settings → Permissions**, grant **Create** to the **Users** role only. Do **not** grant Read, Update, or Delete at table level.
6. Create the listed indexes and wait until they are available.

The app sets row-level owner permissions itself. Never add a table-level `any`/guest role or a broad read permission “to make the page work” — that bypasses the intended per-row isolation.

Appwrite automatically adds `$id`, `$createdAt`, `$updatedAt`, `$sequence`, `$tableId`, `$databaseId`, and `$permissions`. Do **not** create duplicate `created_at` or `updated_at` columns. The app maps those names to `$createdAt` and `$updatedAt`.

### `profiles`

| Column | Appwrite type | Size / values | Required | Notes |
| --- | --- | --- | --- | --- |
| `display_name` | String (`varchar`) | 128 | Yes | User-editable app profile name. |

The row ID is the Appwrite Auth user ID. No `user_id` column or index is needed.

Indexes: none.

### `resumes`

| Column | Appwrite type | Size / values | Required | Notes |
| --- | --- | --- | --- | --- |
| `user_id` | String (`varchar`) | 36 | Yes | Owner's Appwrite user ID. |
| `original_filename` | String (`varchar`) | 255 | Yes | Sanitized display metadata, not a storage path. |
| `storage_file_id` | String (`varchar`) | 36 | Yes | Generated private Storage file ID. |
| `file_size` | Integer | — | Yes | Bytes; the app caps uploads at 10 MB. |
| `mime_type` | String (`varchar`) | 100 | Yes | Currently `application/pdf`. |
| `page_count` | Integer | — | No | Reserved for Phase 4; remains null now. |
| `extraction_status` | Enum | `pending`, `processing`, `completed`, `failed` | Yes | New uploads use `pending`. |

Indexes:

- `idx_resumes_user_id` — **key** index on `user_id`.

### `jobs`

| Column | Appwrite type | Size / values | Required | Notes |
| --- | --- | --- | --- | --- |
| `user_id` | String (`varchar`) | 36 | Yes | Owner's Appwrite user ID. |
| `title` | String (`varchar`) | 200 | Yes | Job title. |
| `company_name` | String (`varchar`) | 200 | No | Stored as null when omitted. |
| `description` | String (`mediumtext`) | 30,000 client maximum | Yes | Must be `mediumtext`; Appwrite `text` is capped at 16,383 characters. |
| `responsibilities` | String (`mediumtext`) | 20,000 client maximum | No | Stored as null when omitted. |

Indexes:

- `idx_jobs_user_id` — **key** index on `user_id`.

### `job_requirements`

| Column | Appwrite type | Size / values | Required | Notes |
| --- | --- | --- | --- | --- |
| `job_id` | String (`varchar`) | 36 | Yes | References an owned `jobs` row. |
| `category` | Enum | `required_skill`, `preferred_skill`, `experience`, `education`, `responsibility`, `other` | Yes | Matches the form options. |
| `description` | String (`varchar`) | 2,000 | Yes | Requirement text. |
| `importance` | Enum | `required`, `preferred` | Yes | Importance band. |
| `weight` | Float | — | Yes | Client validates 0.1–10.0; Appwrite does not enforce that range. |

Indexes:

- `idx_job_requirements_job_id` — **key** index on `job_id`.

Ownership is derived from the parent job. The table does not have a `user_id` column. A requirement row grants owner read/update/delete permissions to the same user as the job.

### Why these indexes

The services query with `Query.equal('user_id', ...)` and `Query.equal('job_id', ...)`, and sort results by Appwrite's system creation timestamp. This app configures a key index on each filtered ownership/reference column, following Appwrite's recommendation to index queried columns. If the Console reports that ordering needs an additional index, create the appropriate composite index before retrying; otherwise the listed indexes are sufficient for this app's query patterns.

### Row Security and permissions

The intended table configuration is:

| Scope | Role | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- | --- |
| `profiles` table | Users | ✅ | — | — | — |
| `resumes` table | Users | ✅ | — | — | — |
| `jobs` table | Users | ✅ | — | — | — |
| `job_requirements` table | Users | ✅ | — | — | — |
| Every created row | Specific owner user | — | ✅ | ✅ | ✅ |

The row permissions are set in code via `lib/appwrite-permissions.ts` and are not Console defaults. Do not configure a default row permission in Console that grants broader access.

## 6. Create the private resumes bucket

1. Open **Storage** and choose **Create bucket**.
2. Name it `Resumes` and set the bucket ID, for example `resumes`.
3. Record the bucket ID for `VITE_APPWRITE_RESUMES_BUCKET_ID`.
4. In **Settings → Permissions**, grant **Create** to the **Users** role only. Do not grant Read, Update, or Delete at bucket level.
5. Open **Settings → File security** and enable **File Security**. Per-file permissions are ignored when this is disabled.
6. Set **Maximum file size** to **10 MB**.
7. Set **Allowed file extensions** to `pdf` only. Appwrite expects the extension without a leading dot. If the Console displays `.pdf`, that is the same setting.
8. Open **Settings → Security settings** and enable **Encryption** if your plan and Console version offer it. The application does not depend on this setting for access control.
9. Enable **Antivirus** if your Appwrite plan offers it. Antivirus is an additional safeguard, not a replacement for the app's PDF-signature check.
10. Leave any optional compression or image-processing settings at their defaults; this bucket is not used for images.
11. Do not make the bucket public and do not add a public read role.

The app uploads with a generated file ID and these file permissions:

- `read("user:<owner-id>")`
- `update("user:<owner-id>")`
- `delete("user:<owner-id>")`

It never requests or stores a public file URL.

Do not create the reports bucket yet. `VITE_APPWRITE_REPORTS_BUCKET_ID` remains optional until reporting is implemented.

## 7. Configure the web app

From `web/`, copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in only public values:

```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=<APPWRITE_PROJECT_ID>
VITE_APPWRITE_DATABASE_ID=<DATABASE_ID>
VITE_APPWRITE_RESUMES_BUCKET_ID=<RESUMES_BUCKET_ID>
```

Leave these unset for now:

```env
VITE_APPWRITE_REPORTS_BUCKET_ID=
VITE_APPWRITE_ANALYZE_FUNCTION_ID=
```

Restart `npm run dev` after changing any environment value. Vite reads the files at server startup.

**Never** put an Appwrite server API key or `GEMINI_API_KEY` in a `VITE_*` variable. Vite embeds those variables into the public bundle. No server API key is needed for Phases 1–3.

## 8. Verify the setup

1. Open <http://localhost:5173/diagnostics>.
2. Confirm the endpoint, project ID, database ID, and resumes bucket ID are structurally valid.
3. Confirm the public connection check reports a successful ping. This only proves endpoint/project reachability, not tables or permissions.
4. Register a test account and open `/dashboard`.
5. Open `/settings`; the app should create a `profiles` row with the user ID as `$id`.
6. Upload a small, valid PDF through `/resumes/new`; the app should create a private file and a `resumes` row.
7. Create and edit a job with requirements; verify the `jobs` and `job_requirements` rows appear in Console.
8. In Console, inspect the created rows and confirm each has only the test user's read/update/delete permissions.
9. Inspect the uploaded file and confirm it has only the test user's file permissions.
10. Follow [data-model.md](data-model.md#manual-security-testing) with two test accounts to verify isolation.

## 9. Troubleshooting

### “CV and job storage is not configured”

`environment.isDataConfigured` is false. Check that `VITE_APPWRITE_DATABASE_ID` and `VITE_APPWRITE_RESUMES_BUCKET_ID` are set in `web/.env.local` and restart Vite. Authentication can still work without them.

### Database or table errors on every data page

- Confirm the table IDs are exactly `profiles`, `resumes`, `jobs`, and `job_requirements`.
- Confirm the database ID in the environment matches the Console.
- Confirm the table is enabled and available.
- Confirm Row Security is enabled and the table grants `create` to Users.
- Confirm the app user's rows have owner read/update/delete permissions. The app requests them explicitly for every row it creates.

### “Index not found” or a query fails

Create the indexes listed above and wait for Appwrite to finish building them. Index creation is asynchronous. If the Console specifically complains about ordering by `$createdAt`, add a composite key index for the filtered column plus `$createdAt`, then retry.

### Upload rejected for MIME type

The browser must report the file as `application/pdf`. Some desktop environments report an empty MIME type for valid PDFs; those uploads are deliberately rejected by the current client rule. Use a PDF selected from the local filesystem or a browser that identifies PDFs correctly. Server-side signature validation belongs to Phase 4.

### Upload rejected for extension or signature

Only filenames ending in `.pdf` with a detectable `%PDF-` header within the first 1,024 bytes are accepted. Renaming another file type does not bypass the signature check.

### Cross-account access expected to fail

Correct. A row or file from another account should return an authorization or not-found error. Do not weaken table/bucket permissions to troubleshoot this.

### Profile creation conflict

`getOrCreateProfile()` treats an existing row as the expected state. A `409` during creation is handled by re-reading the row. If the conflict persists, inspect for a malformed profile row.

### A job with many requirements fails to save

A job supports at most **45** requirements. This keeps a full replacement below Appwrite Free's 100-operation transaction limit. Reduce the count or split the job. The UI disables adding more at the cap.

### A CV metadata row remains after a failed deletion

The app deletes the private file first and the metadata row second. If file deletion fails, the row remains and the operation is retryable. If file deletion succeeds but row deletion fails, retry deletion; a missing file is treated as already removed.

### Uploaded file has no metadata row

If metadata creation failed after the file upload, the app attempts best-effort cleanup of the generated metadata row and private file. If cleanup also failed, an unreferenced private file or metadata row may remain. An administrator can identify it by creation time and remove it. There is no background cleanup job in Phase 3.

### Sessions expire

Resource calls may return a safe error after the session expires. Sign in again. Automatic redirect-on-401 for resource queries is deferred.

## 10. Phase 5 Additions: Analysis Tables and Function

In Phase 5, the following components are created in the Appwrite Cloud project:
- Three new TablesDB tables: `analyses`, `requirement_matches`, `recommendations`
- One server-side Python function: `analyze-cv`
- One server-side API key for the function: `analyze-cv-function-key`

The `reports` table and `reports` storage bucket remain reserved for Phase 7 (PDF reports). Do not create them yet.

## 11. Phase 5 Setup Instructions

### 11.1 Create the Three Analysis Tables

Open the `cvmatch` database and create the following three tables:

#### Table `analyses`
- **ID:** `analyses`
- **Row Security:** Enabled
- **Table Permissions:** Grant `Create` to role `Users` only
- **Columns:**
  - `user_id` (String, size 36, required)
  - `resume_id` (String, size 36, required)
  - `job_id` (String, size 36, required)
  - `status` (Enum: `queued`, `processing`, `completed`, `failed`, required)
  - `compatibility_score` (Float, optional)
  - `ats_score` (Float, optional)
  - `requirement_coverage` (Float, optional)
  - `scoring_version` (String, size 20, required, default `"1.0"`)
  - `model_id` (String, size 100, optional)
  - `error_code` (String, size 60, optional)
  - `completed_at` (String, size 32, optional)
- **Indexes:**
  - `idx_analyses_user`: `user_id` (ASC)
  - `idx_analyses_resume`: `resume_id` (ASC)
  - `idx_analyses_job`: `job_id` (ASC)
  - `idx_analyses_status`: `status` (ASC)

#### Table `requirement_matches`
- **ID:** `requirement_matches`
- **Row Security:** Enabled
- **Table Permissions:** Grant `Create` to role `Users` only
- **Columns:**
  - `analysis_id` (String, size 36, required)
  - `requirement_id` (String, size 36, required)
  - `status` (Enum: `matched`, `partially_matched`, `not_demonstrated`, `explicitly_missing`, required)
  - `match_score` (Float, required)
  - `evidence` (String, size 2000, optional)
  - `source_section` (String, size 200, optional)
  - `source_page` (Integer, optional)
  - `explanation` (String, size 1000, optional)
- **Indexes:**
  - `idx_matches_analysis`: `analysis_id` (ASC)
  - `idx_matches_req`: `requirement_id` (ASC)

#### Table `recommendations`
- **ID:** `recommendations`
- **Row Security:** Enabled
- **Table Permissions:** Grant `Create` to role `Users` only
- **Columns:**
  - `analysis_id` (String, size 36, required)
  - `category` (String, size 60, required)
  - `priority` (Integer, required)
  - `title` (String, size 200, required)
  - `description` (String, size 2000, required)
  - `suggested_action` (String, size 1000, optional)
- **Indexes:**
  - `idx_recs_analysis`: `analysis_id` (ASC)
  - `idx_recs_priority`: `priority` (ASC)

### 11.2 Create Server API Key for Function

In **Project Settings → API Keys**, create `analyze-cv-function-key`:
- **Console UI Checkbox Selection:**
  - Locate category **Databases**: Check **`read`** and **`write`** (enables read and write access to documents in `cvmatch`).
  - Locate category **Storage**: Check **`read`** (enables read access to download raw PDF files from the private `resumes` bucket).
- **Equivalent Appwrite CLI / API Scopes:**
  - `databases.read` (or `documents.read`)
  - `databases.write` (or `documents.write`)
  - `files.read`
- **Scopes NOT to Grant:**
  - Do NOT grant user management (`users.read`, `users.write`), project administration, or storage write/delete permissions.
- **Function Execution Permissions Note:**
  - Function execution permissions are NOT set on the API key. They are configured on the Function itself (`Execute Permissions: Users`).
- Record the generated secret key to set as `APPWRITE_API_KEY` in the Function's variables.

### 11.3 Function Execution Security and Invocation Flow

CVMatch AI employs a defense-in-depth model combining gateway-level authorization and server-side session verification:

```
[ Frontend (Client SDK) ]
          │
          │ 1. functions.createExecution("6afb06d2000dc82cad3e", body)
          │    (Transmits active Appwrite session cookie `a_session_*`)
          ▼
[ Appwrite API Gateway ]
          │
          ├─► Enforces `Execute: ["users"]` (rejects unauthenticated/guest calls)
          ├─► Strips any untrusted client-supplied `x-appwrite-*` headers
          ├─► Injects verified context headers:
          │     - `x-appwrite-user-id`: Caller's verified Appwrite user ID
          │     - `x-appwrite-user-jwt`: Short-lived JWT scoped to caller
          ▼
[ analyze-cv Function (src/main.py) ]
          │
          ├─► 2. Extract context headers (src/auth.py)
          ├─► 3. Initialize user-scoped Appwrite Client with JWT
          ├─► 4. Verify Identity: Call Account(user_client).get()
          │     - Confirms JWT is valid, active, and not expired
          │     - Confirms account ID matches `x-appwrite-user-id`
          │     - Rejects any forged/stale token with 401 AccessDenied
          ├─► 5. Resource Ownership Check:
          │     - Query `resumes` and `jobs` tables using caller's user_id filter
          │     - Return 404 (NotFound) if resource does not belong to caller
          └─► 6. Execute PDF Extraction & Gemini Analysis
```

#### Client SDK vs Direct HTTP Function URL Invocations:
1. **Client SDK Invocation (`functions.createExecution`)**:
   - The primary invocation method used by the frontend web and desktop apps.
   - Appwrite verifies user authentication against the session cookie before routing to the container.
   - Appwrite injects `x-appwrite-user-id` and `x-appwrite-user-jwt`.
2. **Direct HTTP Function URL / Domain Invocation**:
   - If invoked over raw HTTP outside the SDK, external clients cannot inject trusted internal headers.
   - Any external caller attempting to supply fabricated `x-appwrite-user-id` or missing JWT fails verification in Step 4 (`Account(user_client).get()` raises 401 Unauthorized), safely blocking impersonation attacks.

### 11.4 Deploy and Configure analyze-cv Function

Follow the complete step-by-step instructions in [function-deployment.md](function-deployment.md) to package, deploy, and verify the `analyze-cv` function.
