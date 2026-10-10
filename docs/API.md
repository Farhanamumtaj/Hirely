# API reference (current implementation)

All API requests use JSON unless stated otherwise. Auth cookies are HttpOnly; clients must send credentials. Success payloads are wrapped in `data`; errors use `error.code` and `error.message`.

| Method | Path | Auth | Body / behavior |
|---|---|---|---|
| GET | `/api/health` | No | Returns `{ data: { status: "ok" } }` |
| POST | `/api/auth/register` | No | `fullName`, `email`, `password`, `confirmPassword`; creates account and session |
| POST | `/api/auth/login` | No | `email`, `password`; generic invalid-credentials error |
| POST | `/api/auth/google` | No | `credential` Google ID token; server verifies it |
| POST | `/api/auth/refresh` | Refresh cookie | Rotates refresh token and reissues access cookie |
| POST | `/api/auth/logout` | Access cookie | Revokes current session and clears cookies; returns 204 |
| GET | `/api/auth/me` | Access cookie | Returns safe user profile fields |

Import and profile routes are still planned; resume CRUD, document exports, and job-match analysis are exposed.

## Resume CRUD (authenticated)
All endpoints require the `ra_access` HttpOnly cookie. The server derives the owner from the verified session; clients must never send a user ID.

- `GET /api/resumes` returns `{ data: { resumes: Resume[] } }` ordered by last update.
- `POST /api/resumes` validates a structured resume and returns `201 { data: { resume } }`.
- `GET /api/resumes/:id` returns one owned resume or `404 RESUME_NOT_FOUND`.
- `PUT /api/resumes/:id` validates and replaces the structured resume document, returning the saved representation.
- `DELETE /api/resumes/:id` deletes only a resume owned by the current user and returns `204`.

Resume JSON uses camelCase at the API boundary (`personalInformation`, `professionalSummary`, `resumeData`, `preferredFormat`, `sectionOrder`, `sectionVisibility`, and `customSectionConfiguration`). JSONB columns store extensible resume sections while relational foreign keys enforce user ownership. Every SQL query is parameterized.

The resume editor validates email formatting, HTTPS profile links, and comparable `YYYY-MM` date ranges in the client before submitting. Section visibility and ordering are persisted through `sectionVisibility` and `sectionOrder`. The export endpoints generate PDF and editable DOCX documents from the saved resume; exports respect standard section order and visibility. Content length can span multiple pages even when the one-page format is selected.


## Document exports (authenticated)

- `GET /api/resumes/:id/export/pdf` returns an `application/pdf` attachment generated with PDFKit.
- `GET /api/resumes/:id/export/docx` returns an editable Word `.docx` attachment generated with `docx`.

Both endpoints verify the resume UUID and ownership using the authenticated user. Export only includes the last saved version; save edits first. The one-page preference uses compact typography but does not guarantee that all content fits on one page. Automated visual regression and end-to-end export tests are still needed.


## AI job-match analysis (authenticated)

- `POST /api/resumes/:id/optimize` accepts `{ "jobDescription": "..." }` and returns `{ data: { analysis, resumeId, createdAt } }`. The job description must be 80–16,000 characters.
- The route verifies resume ownership, validates input, and is rate-limited to 10 requests per 15 minutes per client IP.
- Configure `AI_PROVIDER=gemini` plus `GEMINI_API_KEY`, or `AI_PROVIDER=openai` plus `OPENAI_API_KEY`. Model names can be overridden with `GEMINI_MODEL` or `OPENAI_MODEL`. Keys belong only in the server environment, never in Vite/client variables.
- The response contains an estimated match score, resume evidence for matched skills, potential gaps, bullet improvements, strengths, and a learning plan. AI output is advisory and should be verified. Missing skills must not be presented as current qualifications; the analysis does not directly change the saved resume.

## Theme preference

The client header includes a light/dark toggle. It applies theme tokens app-wide and persists the choice in browser local storage. Resume preview paper remains white to preserve professional print/export output.

### Import an existing resume

`POST /api/resumes/import` (authenticated, `multipart/form-data`)

- Field name: `file`
- Accepted file extensions: `.pdf`, `.docx`, `.txt`
- Maximum file size: `MAX_UPLOAD_SIZE` bytes (defaults to 10 MiB)
- Response: `201` with the created resume and import warnings.
- The service extracts text in memory and does not persist the original upload. It uses common headings to populate a draft. Parsing is heuristic; users must review names, dates, links, and section placement.
- Text-based PDFs are supported; scanned/image-only PDFs need OCR, which is not included.
- Errors include `FILE_REQUIRED`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `EMPTY_RESUME_TEXT`, and `UNREADABLE_RESUME`.
