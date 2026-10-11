# API Reference — Current Implementation

This document describes the currently implemented ResumeAI API endpoints and their expected behavior.

## General Conventions

- **Base path:** `/api`
- **Request format:** JSON unless otherwise specified.
- **Response format:** Successful JSON responses are wrapped in a `data` object. Errors use `error.code` and `error.message`.
- **Authentication:** Authenticated endpoints use HttpOnly cookies. Clients must send credentials with requests, for example, by configuring `credentials: "include"` in `fetch` or `withCredentials: true` in Axios.
- **Authorization:** The server derives the current user from the verified authentication session. Clients must never supply a user ID to determine resource ownership.
- **Database security:** SQL queries are parameterized, and resume access is restricted to the authenticated owner.

## 1. Health Check

| Method | Endpoint | Authentication | Behavior |
|---|---|---|---|
| GET | `/api/health` | Not required | Returns `{ "data": { "status": "ok" } }`. |

## 2. Authentication

| Method | Endpoint | Authentication | Body / Behavior |
|---|---|---|---|
| POST | `/api/auth/register` | Not required | Accepts `fullName`, `email`, `password`, and `confirmPassword`. Creates an account and establishes a session. |
| POST | `/api/auth/login` | Not required | Accepts `email` and `password`. Returns a generic invalid-credentials error when authentication fails. |
| POST | `/api/auth/google` | Not required | Accepts a Google ID token in `credential`. The server verifies the token before authenticating the user. |
| POST | `/api/auth/refresh` | Valid refresh cookie | Rotates the refresh token and reissues the access cookie. |
| POST | `/api/auth/logout` | Valid access cookie | Revokes the current session, clears authentication cookies, and returns `204 No Content`. |
| GET | `/api/auth/me` | Valid access cookie | Returns safe profile fields for the authenticated user. |

Authentication cookies are HttpOnly and should not be read or managed directly by client-side JavaScript. Refresh-token rotation and session revocation are handled by the server.

## 3. Resume CRUD

All endpoints in this section require the `ra_access` HttpOnly cookie.

### Endpoints

| Method | Endpoint | Behavior |
|---|---|---|
| GET | `/api/resumes` | Returns `{ "data": { "resumes": Resume[] } }`, ordered by last update. |
| POST | `/api/resumes` | Validates a structured resume and returns `201 Created` with `{ "data": { "resume": Resume } }`. |
| GET | `/api/resumes/:id` | Returns one resume owned by the authenticated user. Returns `404 RESUME_NOT_FOUND` if the resume is unavailable to that user. |
| PUT | `/api/resumes/:id` | Validates and replaces the structured resume document, then returns the saved representation. |
| DELETE | `/api/resumes/:id` | Deletes only a resume owned by the authenticated user and returns `204 No Content`. |

### Resume Data Format

The API uses camelCase field names, including:

- `personalInformation`
- `professionalSummary`
- `resumeData`
- `preferredFormat`
- `sectionOrder`
- `sectionVisibility`
- `customSectionConfiguration`

Flexible resume sections are stored in PostgreSQL JSONB columns, while relational foreign keys enforce ownership relationships.

The resume editor validates email formatting, HTTPS profile links, and comparable `YYYY-MM` date ranges on the client before submission. The server must independently validate all relevant input before persisting it.

Section ordering and visibility are persisted using `sectionOrder` and `sectionVisibility`.

## 4. Document Exports

All export endpoints require authentication and verify resume ownership.

| Method | Endpoint | Response |
|---|---|---|
| GET | `/api/resumes/:id/export/pdf` | PDF attachment with content type `application/pdf`, generated using PDFKit. |
| GET | `/api/resumes/:id/export/docx` | Editable Word `.docx` attachment generated using the `docx` library. |

### Export Behavior

- Exports contain the **last saved version** of the resume. Save changes before exporting.
- The export process respects the configured standard section order and section visibility.
- The one-page format preference applies compact typography and spacing; it does not guarantee that all content fits on one page.
- Longer resumes may span multiple pages.
- Export requests must validate the resume identifier and enforce ownership before generating a document.

**Testing note:** Automated visual regression tests and end-to-end export tests are still needed to verify layout consistency, page overflow, document integrity, and rendering across different resume lengths.

## 5. AI Job-Match Analysis

**Endpoint:** `POST /api/resumes/:id/optimize`

**Authentication:** Required (`ra_access` HttpOnly cookie).

### Request

Content-Type: `application/json`

```json
{
  "jobDescription": "Paste the target job description here..."
}
```

The job description must contain between 80 and 16,000 characters.

### Response

Successful responses use the following envelope:

```json
{
  "data": {
    "analysis": {},
    "resumeId": "resume-uuid",
    "createdAt": "ISO-8601-timestamp"
  }
}
```

The `analysis` object contains the generated job-match analysis. Its detailed structure is determined by the application's analysis schema.

### Analysis Features

The analysis can include:

- An estimated resume-to-job-description match score.
- Matched skills supported by evidence from the existing resume.
- Potential skill gaps and partially matched requirements.
- Suggested improvements to existing resume bullet points.
- Resume strengths relevant to the target role.
- A learning plan with recommendations for addressing skill gaps.

AI-generated results are advisory and should be reviewed before use.

**Important integrity rule:** The analysis must not present missing skills, qualifications, projects, or achievements as existing user credentials. Suggested improvements must remain grounded in the user's actual experience. The analysis endpoint must not directly modify the saved resume.

### Rate Limiting

The endpoint is rate-limited to 10 requests per 15 minutes per client IP.

### AI Provider Configuration

Configure the provider in the server environment.

For Gemini:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_supported_model_name
```

For OpenAI:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_supported_model_name
```

Model overrides are optional when supported defaults are configured by the application.

**Security requirements:**

- Keep AI provider API keys exclusively in the server environment.
- Never expose provider keys through Vite or other client-side environment variables.
- Never commit actual API keys to version control.
- Validate and handle provider errors, malformed responses, and timeouts safely.

## 6. Import an Existing Resume

**Endpoint:** `POST /api/resumes/import`

**Authentication:** Required (`ra_access` HttpOnly cookie).

**Content-Type:** `multipart/form-data`

### Request

| Field | Requirement |
|---|---|
| `file` | Required. The resume file to import. |
| Accepted extensions | `.pdf`, `.docx`, `.txt` |
| Maximum file size | `MAX_UPLOAD_SIZE` bytes; defaults to 10 MiB when not overridden. |

The multipart field name must be `file`.

### Behavior

1. The server validates the uploaded file's presence, size, and supported type.
2. The import service extracts text in memory.
3. Common resume headings and heuristic parsing are used to populate a structured resume draft.
4. The endpoint returns `201 Created` with the created resume and import warnings.

The original uploaded file is not persisted by the import service.

### Limitations

- Text-based PDFs are supported.
- Scanned or image-only PDFs require OCR, which is not included.
- Parsing is heuristic and may incorrectly identify names, dates, links, headings, or section boundaries.
- Imported content must be reviewed and corrected by the user before relying on the generated resume.
- Importing a resume must not introduce qualifications or achievements that are absent from the source document.

### Import Errors

| Error code | Meaning |
|---|---|
| `FILE_REQUIRED` | No file was provided. |
| `FILE_TOO_LARGE` | The uploaded file exceeds the configured size limit. |
| `UNSUPPORTED_FILE_TYPE` | The file type is not supported. |
| `EMPTY_RESUME_TEXT` | No usable resume text was extracted. |
| `UNREADABLE_RESUME` | The file could not be read or processed successfully. |

The exact HTTP status associated with each error depends on the server's error-handling implementation.

## 7. Theme Preference

The client header provides a light/dark theme toggle.

- Theme tokens are applied across the application.
- The selected theme is persisted in browser local storage.
- Resume preview paper remains white to preserve professional print and export presentation.
- Theme preference is a client-side setting and does not require an API endpoint.

## 8. Planned and Unavailable API Areas

The following areas should be documented as planned only until their routes and functionality are implemented and verified:

- **Dedicated profile management routes:** Profile-specific update endpoints are not documented as implemented here. The existing `GET /api/auth/me` endpoint returns the authenticated user's safe profile fields.
- **Additional import capabilities:** OCR for scanned PDFs and more advanced resume parsing are not included in the documented import implementation.

Resume CRUD, PDF/DOCX exports, AI job-match analysis, and resume import are documented above as implemented features. Their actual availability should be confirmed against the current source code and automated tests before release.

## 9. Implementation and Testing Notes

Before treating this reference as a production API contract, verify the following against the current implementation:

- Authentication cookie names, expiry, `Secure`, `SameSite`, and domain settings.
- Request schemas, response fields, and HTTP status codes for each endpoint.
- Refresh-token rotation, replay protection, and session revocation behavior.
- Authorization checks for every resume read, update, delete, export, and analysis operation.
- File-size and file-type validation, including file-content validation.
- AI provider failure handling, rate limiting, and response-schema validation.
- PDF/DOCX export correctness and multi-page behavior.
- Automated integration tests for authentication, resume ownership, imports, exports, and job-match analysis.

This reference describes the expected API behavior based on the documented implementation. Source code and automated tests remain the authority for exact runtime behavior.