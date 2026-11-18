# Phase 3 Data Model and Security

This document defines the persisted profile, CV, job, and job-requirement model, the ownership boundary enforced by Appwrite, the lifecycle of each resource, and the manual tests required before relying on the data layer.

> **Status:** the application code is implemented and its pure-logic tests pass. No live Appwrite database, storage bucket, index, permission set, transaction, or cross-user access test has been verified from this workspace. The setup steps are in [appwrite-setup.md](appwrite-setup.md). Treat the security-test procedures below as required acceptance work, not as completed evidence.

## Scope

Phase 3 persists:

- An app-level user profile.
- Private CV files plus CV metadata.
- Jobs.
- Job requirements.

Phase 3 does **not** persist extracted CV text, analyses, requirement matches, recommendations, or reports. Those tables and the analysis Function are later-phase work.

## Table overview

| Table | Purpose | Identity | Owner field |
| --- | --- | --- | --- |
| `profiles` | App-level display profile. | `$id` = Appwrite Auth user ID. | Row ID. |
| `resumes` | Metadata for a private PDF. | Generated row ID. | `user_id`. |
| `jobs` | A saved job opportunity. | Generated row ID. | `user_id`. |
| `job_requirements` | Structured requirements for a job. | Generated row ID. | Parent `job_id`; row permissions match the job owner. |

```text
Appwrite Auth user
  └── profiles row ($id = user ID)

Appwrite Auth user
  ├── resumes rows (user_id, storage_file_id) ──> private Storage file
  └── jobs rows (user_id)
        └── job_requirements rows (job_id)
```

The arrow between jobs and requirements is an application-level reference, not an Appwrite relationship column. Referential integrity is maintained by service transactions and ownership checks.

## Common conventions

### System fields

The app never duplicates Appwrite's system timestamps:

| UI/domain field | Appwrite field |
| --- | --- |
| `createdAt` | `$createdAt` |
| `updatedAt` | `$updatedAt` |

Other system fields (`$id`, `$permissions`, `$sequence`, `$tableId`, `$databaseId`) are returned by Appwrite and validated only where needed. There are no custom `created_at` or `updated_at` columns.

### IDs

- Profile IDs are the authenticated Appwrite user ID.
- Resume, job, and requirement IDs are generated with `ID.unique()`.
- Storage file IDs are generated independently with `ID.unique()`, and the stored filename is `<file-id>.pdf`.
- A user-provided filename is sanitized and stored as metadata only. It never becomes a path, ID, or storage filename.

### Validation layers

1. **Browser forms** use React Hook Form and Zod for immediate feedback, length limits, enums, numeric ranges, and entry counts.
2. **Services** re-run Zod schemas before writes and validate returned Appwrite rows before exposing domain objects.
3. **Appwrite schema** enforces required fields, enums, column types, and string sizes.
4. **Appwrite permissions** enforce who can read, update, and delete an existing row/file.

Appwrite's schema does not enforce all business rules. For example, `weight` has an Appwrite Float type but its 0.1–10.0 range is only checked by the client. A modified browser client can bypass client checks. Trusted server-side validation is deferred to Phase 4 Appwrite Functions. This is a data-quality limitation, not a cross-user read/write bypass.

## Schema details

The exact Console column sizes and enum values are repeated in [appwrite-setup.md](appwrite-setup.md). The field names below must match the app.

### `profiles`

| Field | Type in app | Required | Rules |
| --- | --- | --- | --- |
| `$id` | string | Yes | Must equal the signed-in Appwrite user ID. |
| `display_name` | string | Yes | Trimmed, 1–128 characters. |
| `$createdAt` | ISO 8601 string | Yes | Appwrite system attribute. |
| `$updatedAt` | ISO 8601 string | Yes | Appwrite system attribute. |

There is no email, password, token, role, or secret column. Authentication data stays in Appwrite Auth.

**Read/creation flow:** `getOrCreateProfile()` attempts `getRow` with the user ID. A `404` triggers a create with that same row ID. A `409` means another tab likely won the race; the service re-reads and validates the row. Any unexpected error is surfaced through the safe error mapping.

**Update flow:** the user's name is validated, the profile is ensured to exist, then `updateRow` sets `display_name` and reapplies owner-only permissions. The Appwrite Auth account name is not changed.

### `resumes`

| Field | Type in app | Required | Rules |
| --- | --- | --- | --- |
| `$id` | string | Yes | Generated row ID. |
| `user_id` | string | Yes | Must equal the signed-in user for any browser read or deletion. Indexed. |
| `original_filename` | string | Yes | Sanitized display name, max 255 characters. |
| `storage_file_id` | string | Yes | Generated private Storage file ID, max 36 characters. |
| `file_size` | integer | Yes | Positive byte count, upload capped at 10 MiB. |
| `mime_type` | string | Yes | `application/pdf` for app uploads. |
| `page_count` | integer or null | No | Null in Phase 3. Phase 4 reserves it for extraction. |
| `extraction_status` | enum string | Yes | `pending`, `processing`, `completed`, or `failed`; new uploads use `pending`. |
| `$createdAt` | ISO 8601 string | Yes | Appwrite system attribute. |
| `$updatedAt` | ISO 8601 string | Yes | Appwrite system attribute. |

No full CV text is stored in TablesDB. The PDF is the only content record, and it is private.

The UI displays `pending` as “Awaiting extraction”. `processing`, `completed`, and `failed` are reserved for Phase 4; the current UI can render them if present but never sets them.

### `jobs`

| Field | Type in app | Required | Rules |
| --- | --- | --- | --- |
| `$id` | string | Yes | Generated row ID. |
| `user_id` | string | Yes | Owner Appwrite user ID. Indexed. |
| `title` | string | Yes | 1–200 characters after trimming. |
| `company_name` | string or null | No | Max 200 characters after trimming; null when omitted. |
| `description` | string | Yes | 1–30,000 characters; requires a `mediumtext` Appwrite column. |
| `responsibilities` | string or null | No | Max 20,000 characters; null when omitted; requires `mediumtext`. |
| `$createdAt` | ISO 8601 string | Yes | Appwrite system attribute. |
| `$updatedAt` | ISO 8601 string | Yes | Appwrite system attribute. |

Job text is displayed as plain text with whitespace preserved. It is not rendered as HTML or Markdown, which prevents stored HTML/script injection through these fields.

### `job_requirements`

| Field | Type in app | Required | Rules |
| --- | --- | --- | --- |
| `$id` | string | Yes | Generated row ID. |
| `job_id` | string | Yes | Must reference the job being read or edited. Indexed. |
| `category` | enum string | Yes | `required_skill`, `preferred_skill`, `experience`, `education`, `responsibility`, `other`. |
| `description` | string | Yes | 1–2,000 characters after trimming. |
| `importance` | enum string | Yes | `required` or `preferred`. |
| `weight` | number | Yes | 0.1–10.0, finite; client-enforced. |
| `$createdAt` | ISO 8601 string | Yes | Appwrite system attribute. |
| `$updatedAt` | ISO 8601 string | Yes | Appwrite system attribute. |

A requirement does not have its own `user_id`. Ownership comes from its parent job, and each requirement row receives the same owner-only permissions as the job.

**Maximum count:** 45 requirements per job. The UI disables adding more, Zod rejects more, and the service validates the same schema.

**Why 45:** a full edit can stage one job update, up to 45 requirement creates, and up to 45 requirement deletes. That is 91 transaction operations, below Appwrite Free’s 100-operation transaction limit.

## Ownership and permissions

### Appwrite configuration

Every active table is configured as follows:

- Row Security enabled.
- Table-level permission: `create` for the `Users` role only.
- No table-level `read`, `update`, or `delete` for users.
- Each new row: `read`, `update`, and `delete` for the owner’s specific user role only.

The resumes bucket is configured as follows:

- File Security enabled.
- Bucket-level permission: `create` for the `Users` role only.
- No bucket-level read/update/delete.
- Each file: owner-only read/update/delete.
- Private bucket, `pdf` only, 10 MB maximum, encryption enabled when the plan offers it.
- No public file view or download URLs are requested by the app.

This follows Appwrite’s documented private-row/private-file pattern. Row and file permissions are the authorization boundary. The table/bucket `create` grant is what lets a signed-in user create new resources; it does not grant access to existing resources.

### Browser defense in depth

Services use the signed-in user ID when reading and writing:

- `assertRecordOwnership()` rejects returned `resumes`/`jobs` rows whose `user_id` does not match the session user.
- Profile rows must have `$id` equal to the session user.
- Requirement rows must have `job_id` equal to the fetched job.
- The service only accepts a submitted existing requirement ID if it appears in that job’s fetched requirement set, preventing an edit from targeting a different job’s row.

These checks protect the UI from acting on inconsistent data. They do not replace Appwrite permissions, and they cannot constrain a malicious client that talks to the Appwrite API directly.

### Permission strings

Rows and files are created with:

```text
read("user:<AUTH_USER_ID>")
update("user:<AUTH_USER_ID>")
delete("user:<AUTH_USER_ID>")
```

`create` is not a valid row/file permission in Appwrite; it belongs on the table/bucket. The app does not grant `any`, `guests`, `users`, teams, labels, or roles on individual resources.

### Appwrite clients

Only the public Web SDK credentials are used. There is no API key in the browser, so all Phase 3 operations are checked against the current user session and row/file permissions. Server-side SDK clients bypass permissions by design and must never be shipped to the browser.

## Resource lifecycles

### Profile lifecycle

1. The authenticated shell, dashboard, or settings page queries the profile.
2. The service reads `profiles/<user-id>`.
3. If missing, it creates the row with the user ID, the account name (or email prefix) as the initial display name, and owner-only permissions.
4. A concurrent create conflict is resolved by re-reading.
5. Settings updates only `display_name` and reasserts owner permissions.
6. Logout clears the profile query cache.

The profile is created lazily so registration remains usable if the database is temporarily unavailable. A user may therefore have an Auth account without a `profiles` row until they open a protected data screen.

### CV upload lifecycle

1. The browser validates filename extension `.pdf`, MIME type `application/pdf`, non-empty file size, 10 MiB maximum, and a `%PDF-` signature within the first 1,024 bytes.
2. The service validates the same function again before any network call.
3. The service requires both database and bucket configuration.
4. It generates a Storage file ID, rewrites the upload filename to `<file-id>.pdf`, and uploads with the forced MIME type `application/pdf` and owner-only file permissions.
5. It creates a `resumes` row with the sanitized original filename, generated file ID, actual uploaded size, MIME type, `pending` status, and owner-only row permissions.
6. If metadata creation fails, it attempts to remove both the generated metadata row (in case the create committed but its response was lost) and the uploaded file, then returns a safe `ResumeUploadError`.
7. The React Query cache for the user’s resumes and dashboard is invalidated after success.

The 10 MB limit is MiB (`10 × 1024 × 1024` bytes). The bucket limit is an additional backstop for direct uploads.

The file signature check is intentionally shallow. It does **not** prove the file is a valid, unencrypted PDF, does not count pages, and does not parse CV text. Those checks belong to Phase 4.

### CV deletion lifecycle

1. Read the resume row.
2. Validate `user_id` against the session.
3. Delete the private file first.
4. A missing file (`storage_file_not_found`) is treated as already deleted.
5. Delete the metadata row. A missing row is treated as already deleted.
6. If file deletion fails for another reason, leave the row intact so the operation can be retried.
7. If file deletion succeeds but row deletion fails, show a specific retryable error; retrying tolerates the missing file and finishes metadata removal.

This order avoids a row that points to an existing private file after a partial deletion. The inverse failure can leave an unreferenced file, which is less privacy-sensitive than an orphaned metadata row pointing at inaccessible bytes.

### Job creation

The service validates input, starts a TablesDB transaction, creates the job, creates all requirement rows with the same `job_id` and owner permissions, commits, and returns the new job ID. A staging or commit failure rolls back the transaction.

### Job update

The service fetches the job and its requirements, validates the submitted form, and then:

- Updates the job fields.
- Updates kept requirements by ID, but only if the ID was present in that job’s fetched set.
- Creates requirements without IDs.
- Deletes fetched requirements omitted from the submission.
- Commits all steps atomically.

If another client changes an affected row before commit, Appwrite rejects the transaction with a conflict and the app shows a refresh/retry message. There is no automatic conflict merge or retry.

### Job deletion

The service fetches and validates the job and its owner-scoped requirements, then deletes all requirement rows and the job in one transaction. If any step cannot be staged or committed, it attempts a rollback so the job is not left half-deleted.

## Queries, caches, and limits

| Query | Appwrite query | Limit |
| --- | --- | --- |
| List profiles | Get by user ID | One row. |
| List CVs | `equal('user_id', userId)`, newest first | 100. |
| List jobs | `equal('user_id', userId)`, newest first | 100. |
| Get job | Get by row ID, then validate owner. | One job. |
| List requirements | `equal('job_id', jobId)`, oldest first | 100, though the form caps at 45. |

Indexes configured for the filtered columns are documented in [appwrite-setup.md](appwrite-setup.md#5-create-the-four-active-tables). Lists intentionally show at most 100 rows and say so; pagination is deferred. Dashboard counts show `100+` once the loaded list reaches the cap rather than claiming an exact number.

React Query cache keys are scoped by user ID for profiles, resumes, jobs, and job details. Logout removes all non-auth queries. Mutations invalidate affected lists and details; realtime updates are not used.

## Safe error handling

Services and hooks translate provider failures into a small set of safe messages:

| Condition | User-facing behavior |
| --- | --- |
| Missing database/bucket ID | Configuration notice; data calls are disabled. |
| Missing required table/bucket | Safe setup message with a link/mention of the system check. |
| `401` / missing session | “Session expired, sign in again” style message. Resource queries do not auto-redirect in Phase 3. |
| `403` | “You do not have permission to access that record.” |
| `404` | Record or file not found; a deleted record is not treated as a crash. |
| `409` | Row conflict; profile creation re-reads; other conflicts show refresh/retry guidance. |
| `413` or storage size type | File is larger than the configured/app limit. |
| Storage extension/MIME rejection | Only PDF files / `.pdf` files are accepted. |
| `429` | Rate limit; wait and retry. |
| `5xx` | Temporary data-service unavailability. |
| Network failure | Cannot reach the data service. |
| Unexpected row shape | Data validation error; no raw provider payload is rendered. |
| Upload metadata failure | Safe upload error after best-effort file cleanup. |
| Deletion row failure after file deletion | Specific retryable incomplete-deletion message. |

Raw Appwrite messages, SQL details, stack traces, tokens, and file contents are never rendered.

## Privacy and retention

- CV bytes live only in the private `resumes` bucket.
- No extracted CV text, prompts, analyses, or reports are stored in Phase 3.
- CV filenames are displayed only to the owner; they are sanitized metadata.
- The app never requests public URLs or exposes CVs to the browser outside the upload process.
- Deleting a CV deletes its private file and metadata row.
- There is no account-deletion flow, so Auth account deletion, all owned rows, and all private files must currently be removed manually/administratively.
- There is no background orphan cleanup. Best-effort cleanup is documented below.
- Appwrite Cloud backups, logs, and retention policies are governed by the selected Appwrite Cloud plan and project configuration, not by this frontend.

## Threat model and residual risks

### Trusted boundary

- Appwrite Auth issues and validates user sessions.
- Appwrite row/file permissions enforce access to existing resources.
- The Appwrite schema enforces field presence, types, enums, and configured sizes.
- The frontend is trusted to choose conservative permissions for resources it creates, but it is not trusted to authorize cross-user access.
- Phase 4 Appwrite Functions will be trusted server-side components with secrets.

### Untrusted input

- All browser form input, file bytes, filenames, job text, requirement text, and URL parameters.
- Direct calls to the Appwrite API using a valid user session, bypassing the UI.
- Any row/file permission set supplied by a client.

### Residual risks

1. **Client-created ownership metadata is not enforceable without a trusted backend.** Appwrite grants `create` to authenticated users so the app can work without Functions. A malicious authenticated client can bypass the UI, choose an arbitrary `user_id`/`job_id`, and choose its own row permissions. It still cannot read or modify another user’s existing rows/files unless Appwrite permissions grant it access. This is a data-integrity and availability risk, not a confidentiality bypass for existing records. Phase 4 server-side writes/validation are required to eliminate it.
2. **Cross-reference injection is possible if a target ID is known.** Because `create` is open, a malicious user could create e.g. a requirement row pointing at another user’s job ID and grant a broad read role. If the target later reads the job, that extra row may appear, and deleting the job could fail because the target cannot delete the injected row. Random IDs and the fact that the app does not publish other users’ IDs reduce exposure but do not eliminate it. A trusted write path is the durable fix.
3. **Client validation can be bypassed.** Required/typed/enum column rules still apply, but numeric ranges, text limits not mirrored in Appwrite, and file-signature checks can be bypassed by a direct API client. Phase 4 must revalidate on the server.
4. **Upload/delete consistency is not transactional with Storage.** Appwrite TablesDB transactions do not include Storage in this design. Best-effort cleanup and retry behavior are documented; an orphan private file can remain if both metadata creation and cleanup fail.
5. **No malware scanning guarantee.** Bucket antivirus is a plan/configuration safeguard. The app only checks a PDF header. Phase 4 extraction must treat PDFs as hostile input.
6. **Profile row alias denial.** Appwrite allows a client to choose a row ID for a create. A malicious user who knows another user’s Appwrite user ID could pre-create that profile row ID with inaccessible permissions, blocking the lazy profile creation until an administrator removes it. User IDs are not displayed by this app, but the risk is not zero.
7. **XSS controls depend on React escaping.** Job and requirement text are rendered as text, not HTML. Introducing `dangerouslySetInnerHTML`, Markdown rendering without sanitization, or unsafe file previews would invalidate this assumption.
8. **No idempotency keys.** A timeout after a successful transaction commit can make the client report failure; retrying a create may duplicate a job. Upload cleanup reduces partial-state risk but cannot fully reconcile an ambiguous network failure. Phase 3 does not deduplicate retries.
9. **No automatic session recovery for resource requests.** An expired session produces a safe error and stays on the page until the user signs in again or auth state refreshes.

Do not describe the Phase 3 system as server-side hardened. It uses Appwrite’s private-row/file pattern correctly, but a trusted Function boundary is still required for strict ownership and validation.

## Automated test coverage

`web/src/lib/phase3.test.ts` covers pure logic:

- Owner permission strings are user-scoped.
- Ownership metadata mismatch is rejected.
- Resume extension, MIME type, size, empty-file, and PDF-signature checks.
- Original filename sanitization.
- Formatting helpers.
- Profile/job/requirement Zod schemas and limits.
- Job form ↔ domain input mapping without losing existing requirement IDs.
- Safe error mapping and row error helpers.

Run from `web/`:

```bash
npm test
```

These tests do **not** exercise Appwrite. There are no browser tests, live database tests, Storage tests, or permission integration tests in this phase.

## Manual functional testing

Use a dedicated Appwrite project and disposable accounts. Never test with real CVs or production data.

### Configuration and profile

1. Remove one required `VITE_*` data ID, restart Vite, and open `/dashboard`, `/resumes`, `/jobs`, and `/settings`. Confirm a configuration notice appears and no doomed requests are made.
2. Restore configuration and sign in as account A.
3. Open `/settings`. Confirm a `profiles` row appears in Console with `$id` equal to A’s user ID.
4. Change the display name. Confirm success feedback, refresh persistence, and the dashboard/sidebar name update.
5. Open a second tab, update the profile in both, and confirm the last successful write wins without a crash.

### CV upload and deletion

1. Upload a valid PDF under 10 MB. Confirm progress, success, and an “Awaiting extraction” row.
2. Confirm the Console file is private and has only A’s read/update/delete file permissions.
3. Confirm the metadata row has `user_id` = A, the same file ID, a sanitized filename, and only A’s row permissions.
4. Attempt `.txt`, a renamed non-PDF, an empty file, a file over 10 MB, and a file with no `%PDF-` header. Confirm no Storage file or row is created.
5. Delete the CV from the UI. Confirm the row disappears and the file no longer exists in Console.
6. Simulate a metadata-row failure by temporarily denying `create` on the `resumes` table before submitting an upload. The file should upload, metadata creation should fail, and the app should attempt to remove both the staged metadata row and the uploaded file. Confirm the UI shows a safe error without provider details.
7. Simulate file deletion failure (temporarily deny delete permission) and confirm the row remains with a retryable error. Restore permission and retry; deletion should complete.

### Jobs and requirements

1. Create a job with no requirements. Confirm the detail page and requirement empty state.
2. Create a job with one requirement per category and both importance values.
3. Edit the job title/company/description/responsibilities and verify persistence.
4. Edit one requirement, add another, remove another, and save. Confirm the detail page exactly matches the form and requirement IDs were preserved for kept rows.
5. Create a job with 45 requirements. Confirm the Add requirement action is disabled at the cap.
6. Delete a job. Confirm its requirements no longer exist in Console.
7. In another tab, delete the job while an edit form is open and save. Confirm a safe conflict/not-found error, without a half-written job.
8. Check that job description and responsibilities over 16,383 characters can be saved, proving the `mediumtext` columns are configured correctly.
9. Check that lists state the 100-record cap after the test account exceeds 100 records (if practical).

### Error and empty states

1. With valid auth but `read` temporarily denied on one table (or a disposable test table renamed), confirm a safe permission/not-found message and retry action.
2. With the bucket disabled or renamed, confirm CV upload fails safely and other data pages still load.
3. Delete rows directly in Console for a stale open page and confirm safe not-found messages.
4. Confirm empty CV/job states appear only when the corresponding list is genuinely empty, not during an error.

## Manual security testing

The UI tests alone are not enough. Appwrite permissions must be tested directly with two sessions.

### Preconditions

- The Appwrite project uses the intended table/bucket security settings.
- Account A has a profile, one CV file/metadata row, and at least one job with a requirement.
- Account B is a separate test account with its own data.
- Record A’s:
  - user ID (`A_USER_ID`)
  - profile row ID (same as user ID)
  - job row ID (`A_JOB_ID`)
  - requirement row ID (`A_REQUIREMENT_ID`)
  - resume row ID (`A_RESUME_ID`)
  - resume `storage_file_id` (`A_FILE_ID`)
- Note all IDs and file IDs from Appwrite Console or from A’s own authenticated session. Never paste secrets or real personal data into this document.

### UI-level checks

1. Sign in as B. Confirm B’s `/resumes` and `/jobs` lists contain only B’s records.
2. Navigate to `/jobs/<A_JOB_ID>`. Confirm no title, company, description, or requirements are rendered. Expect a safe not-found/authorization message.
3. Navigate to `/jobs/<A_JOB_ID>/edit`. Confirm the form does not load A’s data and saving is impossible.
4. Confirm dashboard counts show only B’s records.
5. Open `/settings`; confirm B sees B’s profile, not A’s.
6. Confirm B cannot guess an A resume URL; the app has no resume detail route. This is defense by route design, not a substitute for API checks.

### Direct SDK checks

These checks prove Appwrite permissions rather than UI filtering. Run them in a **disposable browser profile signed in as B**, using a separate test account. The snippet loads the same public Appwrite Web SDK version used by the app. It never uses an API key.

1. Sign in to the app as B.
2. Open the browser developer console.
3. Define the public project values and A’s test IDs:

```js
const { Client, Account, TablesDB, Storage, Query } = await import(
  'https://esm.sh/appwrite@29.2.0'
)

const ENDPOINT = 'https://<REGION>.cloud.appwrite.io/v1'
const PROJECT_ID = '<PROJECT_ID>'
const DATABASE_ID = '<DATABASE_ID>'
const RESUMES_BUCKET_ID = '<RESUMES_BUCKET_ID>'

const A_JOB_ID = '<A_JOB_ID>'
const A_REQUIREMENT_ID = '<A_REQUIREMENT_ID>'
const A_RESUME_ID = '<A_RESUME_ID>'
const A_FILE_ID = '<A_FILE_ID>'
const A_USER_ID = '<A_USER_ID>'

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID)
const account = new Account(client)
const tables = new TablesDB(client)
const storage = new Storage(client)

const me = await account.get()
console.log('Current test user:', me.$id, me.email)
if (me.$id === A_USER_ID) {
  throw new Error('Switch to account B before running these checks.')
}
```

If `account.get()` returns `401`, the console-loaded SDK did not receive the app session. In a disposable browser only, you may sign in through the same SDK with B’s test credentials:

```js
await account.createEmailPasswordSession({
  email: '<B_TEST_ACCOUNT_EMAIL>',
  password: '<B_TEST_ACCOUNT_PASSWORD>',
})
```

4. Define a denial helper and run the cross-user checks:

```js
async function expectDenied(label, action) {
  try {
    await action()
    console.error(`FAIL: ${label} was allowed`)
  } catch (error) {
    if (error?.code === 401 || error?.code === 403 || error?.code === 404) {
      console.log(`PASS: ${label} denied (${error.code} ${error.type ?? ''})`)
    } else {
      console.error(`UNEXPECTED: ${label}`, error?.code, error?.type)
    }
  }
}

await expectDenied('B reads A profile', () =>
  tables.getRow({
    databaseId: DATABASE_ID,
    tableId: 'profiles',
    rowId: A_USER_ID,
  }),
)

await expectDenied('B reads A job', () =>
  tables.getRow({
    databaseId: DATABASE_ID,
    tableId: 'jobs',
    rowId: A_JOB_ID,
  }),
)

await expectDenied('B reads A resume metadata', () =>
  tables.getRow({
    databaseId: DATABASE_ID,
    tableId: 'resumes',
    rowId: A_RESUME_ID,
  }),
)

await expectDenied('B reads A job requirement', () =>
  tables.getRow({
    databaseId: DATABASE_ID,
    tableId: 'job_requirements',
    rowId: A_REQUIREMENT_ID,
  }),
)

await expectDenied('B updates A job', () =>
  tables.updateRow({
    databaseId: DATABASE_ID,
    tableId: 'jobs',
    rowId: A_JOB_ID,
    data: { title: 'SECURITY TEST — THIS SHOULD NOT PERSIST' },
  }),
)

await expectDenied('B deletes A resume metadata', () =>
  tables.deleteRow({
    databaseId: DATABASE_ID,
    tableId: 'resumes',
    rowId: A_RESUME_ID,
  }),
)

await expectDenied('B reads A private file metadata', () =>
  storage.getFile({
    bucketId: RESUMES_BUCKET_ID,
    fileId: A_FILE_ID,
  }),
)

await expectDenied('B deletes A private file', () =>
  storage.deleteFile({
    bucketId: RESUMES_BUCKET_ID,
    fileId: A_FILE_ID,
  }),
)
```

The update/delete and file-deletion checks are destructive if permissions are misconfigured. Run them only against disposable test data. A denial may be returned as `403` or `404`; both are acceptable as long as no data is returned or mutated.

5. Verify that filtered and unfiltered lists do not expose A’s rows. A correctly locked table may return an empty/filtered `200` result or deny the list request with `401`/`403`; both are acceptable when A’s row is absent:

```js
async function expectNotVisible(label, action, targetRowId) {
  try {
    const result = await action()
    const leaked = result.rows.some((row) => row.$id === targetRowId)
    if (leaked) {
      console.error(`FAIL: ${label} exposed ${targetRowId}`)
    } else {
      console.log(`PASS: ${label} did not expose ${targetRowId}`)
    }
  } catch (error) {
    if (error?.code === 401 || error?.code === 403 || error?.code === 404) {
      console.log(`PASS: ${label} denied (${error.code} ${error.type ?? ''})`)
    } else {
      console.error(`UNEXPECTED: ${label}`, error?.code, error?.type)
    }
  }
}

await expectNotVisible(
  'Filtered jobs list',
  () =>
    tables.listRows({
      databaseId: DATABASE_ID,
      tableId: 'jobs',
      queries: [Query.equal('user_id', A_USER_ID), Query.limit(100)],
    }),
  A_JOB_ID,
)

await expectNotVisible(
  'Unfiltered jobs list',
  () =>
    tables.listRows({
      databaseId: DATABASE_ID,
      tableId: 'jobs',
      queries: [Query.limit(100)],
    }),
  A_JOB_ID,
)
```

6. Verify A can still access their own resources. In A’s session, the same calls for A’s profile/job/resume/file should succeed. This catches the opposite misconfiguration where owner permissions are missing entirely. Do not use this check to “fix” B’s denial by granting table-level read access.

7. Record the results:

```text
Date:
Project/database:
Appwrite SDK version:
Tester:
B user ID (do not record secrets):
A data IDs:
Profile read by B:        PASS / FAIL
Job read by B:            PASS / FAIL
Requirement read by B:    PASS / FAIL
Resume metadata by B:     PASS / FAIL
Job update by B:          PASS / FAIL
Resume metadata delete:   PASS / FAIL
Private file metadata:    PASS / FAIL
Private file deletion:    PASS / FAIL
Filtered job list:        PASS / FAIL
Unfiltered job list:      PASS / FAIL
Owner self-access:        PASS / FAIL
Notes:
```

### Additional permission checks

- In Console, confirm **Row Security** is enabled on all four tables and that each table grants only `Create` to Users.
- Confirm the bucket has **File Security** enabled and grants only `Create` to Users at bucket level.
- Confirm no table or bucket permission includes `any`, `guests`, or a broad `read`.
- Confirm no test row/file has a permission for a different user, a team, or `users`/`any`.
- Confirm the bucket’s allowed extensions are `pdf` only and maximum size is 10 MB.
- Confirm whether anonymous sessions are enabled. If they are and cannot be disabled, accept that anonymous accounts can create their own rows/files under the `Users` create grants; they still cannot read other users' existing data under the intended permissions.
- Confirm no server API key exists in browser environment values or the built output.
- In a fresh private window with no Appwrite session, confirm listing each active table, reading A’s rows/files, and creating a test row/file are denied with `401`/`403`. If anonymous sessions can be created, they count as authenticated `Users`; confirm the intended anonymous policy separately.

### What these tests cannot prove

- They do not prove that a malicious client cannot create cross-referenced or misleading rows for its own account; see residual risks above.
- They do not prove that a PDF is safe, valid, unencrypted, or extractable.
- They do not test Appwrite transaction behavior under concurrent commits.
- They do not replace an independent security review or server-side validation.

## Future table names

These names are reserved by [`instruction.md`](../instruction.md) and are intentionally not created or used in Phase 3:

- `analyses`
- `requirement_matches`
- `recommendations`
- `reports`

Their fields, permissions, relationship strategy, and lifecycle must be designed and documented when the analysis/reporting phase begins. Do not create them merely to “complete” the current schema.

## Change checklist

When changing the schema or permissions:

1. Update the Appwrite Console column/index/permission definitions.
2. Update `lib/data-constants.ts`, `lib/data-config.ts`, validation schemas, and service mappings.
3. Update [appwrite-setup.md](appwrite-setup.md) and this document.
4. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` from `web/`.
5. Re-run the cross-user direct-SDK checks with two disposable accounts.
6. Record what was actually verified; do not claim live verification from unit tests.
