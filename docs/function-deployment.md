# Appwrite Function Deployment Guide — analyze-cv

This guide details how to package, deploy, configure, and verify the `analyze-cv` Python function on Appwrite Cloud.

---

## 1. Prerequisites

Before deploying the Function, ensure:
1. **Appwrite Cloud Project:** You have an active project on Appwrite Cloud with Python 3.12 support.
2. **Database and Tables:** The `cvmatch` database and all 7 tables exist:
   - `profiles`, `resumes`, `jobs`, `job_requirements` (from Phase 3)
   - `analyses`, `requirement_matches`, `recommendations` (from Phase 5, see [appwrite-setup.md](appwrite-setup.md))
3. **Storage Bucket:** The private `resumes` bucket exists with 10 MB limit and `pdf` extension allowed.
4. **Google AI Studio Account:** An active Gemini API key from [Google AI Studio](https://aistudio.google.com/).

---

## 2. Packaging the Function

The function relies on `cvmatch_core`, which lives in the repository monorepo under `packages/python_core/`. Because Appwrite Cloud builds each function in an isolated container from the function directory, `cvmatch_core` is vendored directly into `appwrite/functions/analyze-cv/vendor/`.

Run the packaging script from the repository root:

```bash
chmod +x scripts/package-function.sh
./scripts/package-function.sh
```

This populates `appwrite/functions/analyze-cv/vendor/` with `cvmatch_core`. The entrypoint `src/main.py` automatically adds this folder to `sys.path`.

---

## 3. Function Configuration in Appwrite Console

1. Navigate to **Functions** in your Appwrite Cloud project console.
2. Click **Create function**.
3. Choose **Manual deployment** or connect via **Git repository**.
4. Configure the following parameters:

| Setting | Value |
|---|---|
| **Name** | `analyze-cv` |
| **Function ID** | `6afb06d2000dc82cad3e` (configured in `appwrite.config.json` and `web/.env`) |
| **Runtime** | `Python 3.12` (`python-3.12`) |
| **Root Directory** | `appwrite/functions/analyze-cv` |
| **Entrypoint** | `src/main.py` |
| **Execute Permissions** | `Users` (only logged-in users may execute) |
| **Timeout** | `300` seconds (5 minutes) |

> [!IMPORTANT]
> Never set **Execute Permissions** to `Any` or `Guests`. The function requires authenticated user sessions to verify document ownership and read private storage files.
>
> **Invocation Mechanism & Security:**
> - When the frontend invokes the Function via the Appwrite Client SDK (`functions.createExecution`), Appwrite's API gateway verifies the caller's active session, strips any untrusted client-supplied headers, and securely injects verified context headers:
>   - `x-appwrite-user-id`: Caller's verified user ID.
>   - `x-appwrite-user-jwt`: Short-lived JWT scoped to caller.
> - Direct HTTP Function URL invocations without an active Appwrite session or with forged headers are rejected by our defense-in-depth verification (`src/auth.py`), which calls `Account(user_client).get()`, raising HTTP 401 `ACCESS_DENIED`.

---

## 4. Server API Key Scopes

The function requires an Appwrite Server API Key to perform privileged operations (such as downloading raw PDF bytes from private storage on behalf of the user, and creating initial analysis rows before user ownership is established).

In **Project Settings → API Keys**, create a dedicated key named `analyze-cv-function-key` with **minimal scopes**:

### Appwrite Console UI Checkboxes
When creating the key in the Appwrite Console, select the following checkboxes:
- **Databases**: Check `read` and `write`
- **Storage**: Check `read`

### Equivalent CLI / API Scopes
| Service | Scope | Purpose |
|---|---|---|
| **Databases** | `databases.read` (or `documents.read`) | Read tables for verification |
| **Databases** | `databases.write` (or `documents.write`) | Write `analyses`, `requirement_matches`, `recommendations` |
| **Storage** | `files.read` | Download PDF from `resumes` bucket |

> [!WARNING]
> Do **not** grant user management (`users.read`, `users.write`), project administration, or unnecessary admin scopes.
> Function execution permissions are configured on the Function itself (`Execute Permissions: Users`), NOT on the API key.

---

## 5. Function Variables and Secrets

In **Functions → analyze-cv → Settings → Variables & Secrets**, add the following:

| Variable Name | Value | Secret? | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Your Google AI Studio API key | **Yes** | Required: Gemini API key for analysis |
| `GEMINI_MODEL` | `gemini-2.0-flash` | No | Optional: Gemini model (default `gemini-2.0-flash`) |
| `GEMINI_TIMEOUT_MS` | `60000` | No | Optional: Request timeout in milliseconds (default: 60,000 ms = 60s) |
| `APPWRITE_API_KEY` | Server API key from Step 4 | **Yes** | Required: Server API key with minimal scopes |
| `APPWRITE_DATABASE_ID` | `cvmatch` | No | Required: Database ID |
| `APPWRITE_RESUMES_BUCKET_ID` | `resumes` | No | Required: Storage bucket ID |

*Note: `APPWRITE_FUNCTION_API_ENDPOINT` and `APPWRITE_FUNCTION_PROJECT_ID` are automatically supplied by Appwrite Cloud at runtime.*

---

## 6. Frontend Environment Configuration

In `web/.env.local`, record the Function ID:

```env
VITE_APPWRITE_ANALYZE_FUNCTION_ID=6afb06d2000dc82cad3e
```

---

## 7. Verification and Security Testing

After deploying, verify the function against a live Appwrite project using the following checks:

### Test 1: Authenticated Analysis (Happy Path)
1. Sign in as User A.
2. Upload a valid text-based PDF via `/resumes/new`.
3. Create a job opportunity with 3 requirements via `/jobs/new`.
4. Trigger analysis for User A's resume and job.
5. Confirm HTTP 200 response returning `{"analysisId": "...", "status": "completed"}`.
6. Check Appwrite Console to confirm:
   - `analyses` row has status `completed`, scores populated, and permissions only for User A.
   - `requirement_matches` has rows created for all requirements.
   - `recommendations` has prioritized entries.
   - `resumes` row has `extraction_status` updated to `completed`.

### Test 2: Unauthenticated Execution (Blocked at Gate)
1. Invoke the function without an active Appwrite session header.
2. Confirm the call is rejected with HTTP 401 (`ACCESS_DENIED`).

### Test 3: Cross-User Resource Access (Ownership Enforcement)
1. Create a second user (User B).
2. Attempt to trigger analysis passing User A's `resumeId` with User B's session.
3. Confirm HTTP 404 (`RESUME_NOT_FOUND`) is returned. No document or AI call is executed.
4. Verify User B cannot view User A's analysis rows in TablesDB.

### Test 4: Image-Only / Scanned PDF (Safe Extraction Failure)
1. Upload a PDF containing only images without embedded text.
2. Trigger analysis.
3. Confirm HTTP 422 (`PDF_TEXT_NOT_FOUND`) is returned with a clear, safe message.
4. Confirm `analyses` row is updated to `status: failed` with `error_code: PDF_TEXT_NOT_FOUND`.

---

## 8. Scoring Engine & Compatibility Calculation

The compatibility score measures candidate fit across the job's defined requirements using fixed category base weights defined in `instruction.md` §8.

### Category Weights

| Category | Canonical Key | Base Weight | Description |
|---|---|---|---|
| **Required technical skills** | `required_technical_skills` | **30%** | Hard technical competencies |
| **Relevant experience** | `relevant_experience` | **20%** | Years of experience, industry background |
| **Education & qualifications** | `education` | **15%** | Degrees, certifications, formal qualifications |
| **Relevant projects** | `projects` | **15%** | Concrete project portfolio evidence |
| **Responsibilities alignment** | `responsibilities` | **10%** | Alignment with day-to-day duties |
| **Preferred / nice-to-have skills** | `preferred_skills` | **10%** | Optional or advantageous skills |
| **Total** | | **100%** | |

### Scoring Principles (Non-Inflation Rule)

1. **Fixed Category Weights:** Category weights are strictly fixed to their canonical base weights.
2. **No Weight Redistribution:** Missing categories (categories with no requirements defined for that job) do **not** have their weights redistributed across present categories. A category without requirements contributes `0.0` points.
3. **Score Boundedness:** The compatibility score is strictly bounded between `0.0` and `100.0`.
4. **Coverage vs Compatibility:**
   - **Requirement Coverage:** Percentage of defined requirements satisfied by the candidate (`matched_count / total_requirements * 100`).
   - **Compatibility Score:** Weighted sum across all categories based on how well the candidate meets each category's expectations.
5. **Sparse Job Detection:** If the job defines requirements covering less than 50% of the possible evaluable weight (e.g. fewer than 3 major categories), the engine flags `is_sparse_job = True` and lists `missing_categories`.

### Worked Examples

#### Example 1: Complete Job (All 6 Categories Present)
A comprehensive job posting defines requirements across all 6 categories. The candidate demonstrates strong qualifications:

| Category | Base Weight | Category Match Avg | Points Earned |
|---|---|---|---|
| Required technical skills | 30 | 0.90 | 27.0 |
| Relevant experience | 20 | 0.85 | 17.0 |
| Education | 15 | 1.00 | 15.0 |
| Projects | 15 | 0.80 | 12.0 |
| Responsibilities | 10 | 0.70 | 7.0 |
| Preferred skills | 10 | 0.50 | 5.0 |
| **Total Compatibility Score** | | | **83.0 / 100.0** |

- `total_evaluable_weight`: 100.0
- `is_sparse_job`: `False`
- `missing_categories`: `[]`

---

#### Example 2: Sparse Job (1 Required Technical Skill Only)
A job has only 1 requirement defined under "Required technical skills". The candidate matches it completely (match score = 1.0).

- **Old (Vulnerable) Formula with Redistribution:**
  - Absent category weights (70%) redistributed to the single present category (30% becomes 100%).
  - Old Compatibility Score = `1.0 * 100% = 100.0%` (Misleading 100% fit for an incomplete job posting).
- **New (Hardened) Fixed-Weight Formula:**
  - Evaluated Category points: `1.0 * 30.0 = 30.0`
  - Absent categories contribute `0.0`.
  - New Compatibility Score = **30.0 / 100.0**
  - Requirement Coverage = **100.0%** (1 of 1 requirement satisfied)
  - `total_evaluable_weight`: `30.0`
  - `is_sparse_job`: `True`
  - `missing_categories`: `["relevant_experience", "education", "projects", "responsibilities", "preferred_skills"]`

---

#### Example 3: Sparse Job (1 Preferred Skill Only)
A job has only 1 requirement under "Preferred skills". The candidate matches it completely.

- **Old Formula:** Score = **100.0%** (Inflation from 10% to 100%).
- **New Formula:** Score = **10.0 / 100.0** (Preserves the 10% maximum contribution of preferred skills).
- `total_evaluable_weight`: `10.0`
- `is_sparse_job`: `True`

---

#### Example 4: Job with No Requirements Defined
A newly created job posting with no requirements yet added.

- Compatibility Score = **0.0 / 100.0**
- Requirement Coverage = **0.0%**
- `total_evaluable_weight`: `0.0`
- `is_sparse_job`: `True`
- `missing_categories`: All 6 categories.

