# Hirely — AI Resume Builder, ATS Analyzer & Job-Match Assistant

Hirely is a full-stack resume builder and evidence-based job-match assistant designed to help users create professional resumes, analyze their alignment with job descriptions, identify skill gaps, and improve their applications without inventing qualifications or experience.

**Project status: In development. Not yet production-ready.**

The repository contains the core application foundations, including authentication, resume CRUD, a structured resume editor, PDF/DOCX export, resume import, AI job-match analysis, and persistent light/dark theme preferences. Full integration testing, document rendering verification, accessibility checks, and production security review remain outstanding.

See [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) for the release checklist.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Resume Design Reference](#resume-design-reference)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Configuration](#environment-configuration)
- [Authentication and Security](#authentication-and-security)
- [API Overview](#api-overview)
- [Resume Import and Export](#resume-import-and-export)
- [AI Job-Match Analysis](#ai-job-match-analysis)
- [Theme and User Interface](#theme-and-user-interface)
- [Development Commands](#development-commands)
- [Testing and Quality Assurance](#testing-and-quality-assurance)
- [Current Limitations](#current-limitations)
- [Project Progress](#project-progress)
- [Production Readiness](#production-readiness)

## Features

### Authentication and account management

- Email and password registration and login.
- Password hashing with bcrypt.
- Google sign-in through Google Identity Services.
- Server-side Google ID token verification.
- Short-lived access JWTs and opaque refresh tokens stored in HttpOnly cookies.
- Refresh-token rotation and server-side session revocation.
- Profile display-name management.
- Protected frontend routes and session restoration.

### Resume builder

- Create, view, update, and delete saved resumes.
- Structured resume editor with a live A4-proportioned preview.
- Personal information, professional summary, skills, education, experience, projects, achievements, and certifications.
- Reorder standard resume sections and control their visibility.
- Validate email addresses, HTTPS profile links, and comparable `YYYY-MM` date ranges.
- Save structured resume data to PostgreSQL.
- Download PDF and editable DOCX versions of saved resumes.
- Import existing resumes from PDF, DOCX, and TXT files.

### AI job-match assistant

- Compare a saved resume with a target job description.
- Generate an estimated match score.
- Identify matched skills, partial matches, and potential skill gaps.
- Suggest improvements to existing resume bullet points.
- Highlight relevant strengths and recommend learning activities.
- Support Gemini or OpenAI through server-side provider configuration.

**Evidence-first principle:** Hirely must not invent skills, qualifications, projects, achievements, or work experience. Suggestions are advisory, and users remain responsible for reviewing AI-generated content.

### User interface

- Editorial-inspired design with serif display headings and warm neutral colors.
- Responsive layouts for desktop, tablet, and mobile.
- Persistent light/dark theme preference.
- White resume paper in the preview for professional print and export styling.
- Dashboard, authentication pages, resume editor, optimizer, profile settings, and not-found route.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router |
| UI | Bootstrap 5, Bootstrap Icons, custom CSS |
| Client API | Centralized Axios instance |
| Backend | Node.js, Express |
| Validation | Zod and server-side request validation |
| Database | PostgreSQL 14+, JSONB |
| Authentication | bcrypt, JWT, HttpOnly cookies, server-managed sessions |
| Google sign-in | Google Identity Services |
| AI integration | Gemini or OpenAI |
| PDF generation | PDFKit |
| DOCX generation | `docx` package |
| Resume parsing | PDF, DOCX, and TXT text extraction |
| Testing | Node.js test runner and application-specific tests |

## Architecture

```text
hirely/
├── client/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── styles/
│       └── utils/
├── server/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   └── validators/
│   └── tests/
├── docs/
│   └── QA_CHECKLIST.md
├── .env.example
└── package.json
```

The exact file layout may evolve as implementation continues.

### Database design

PostgreSQL stores core entities and relationships, including:

- Users.
- Server-managed authentication sessions.
- Resumes.
- AI analysis records.
- Resume versions.
- Upload-related records.
- Migration tracking.

Resume sections and presentation configuration use JSONB to accommodate evolving fields and custom sections without requiring a schema migration for every new section. User identity, ownership, session relationships, and version relationships remain relationally constrained.

SQL queries use parameterized statements.

## Resume Design Reference

The reference document `Farhana_Mumtaj_Resume_ATS.docx` was inspected from the user library. It is intentionally not included in this repository because it contains personal information.

The default resume renderer should follow these design requirements:

- A4 portrait page.
- Approximately 0.5-inch page margins.
- Centered name at approximately 18 pt.
- Centered contact information.
- Uppercase, bold section headings at approximately 11 pt.
- Compact spacing and a single-column layout.
- Bold skill-category labels.
- Simple, readable bullets.
- Black-and-white styling without decorative charts or skill bars.

Use the original reference document locally when implementing visual regression and rendering tests.

The one-page preference uses compact typography and spacing, but content may still extend across multiple pages. Content must never be silently truncated to force a one-page result.

## Prerequisites

- Node.js 22 LTS or another currently supported LTS release.
- npm compatible with the selected Node.js release.
- PostgreSQL 14 or later.
- Git.
- Optional Google OAuth web client ID.
- Optional Gemini or OpenAI API credentials.

Verify your runtime versions:

```bash
node --version
npm --version
psql --version
```

## Local Setup

### 1. Clone the repository

```bash
git clone <your-hirely-repository-url>
cd hirely
```

Replace the placeholder with the actual repository URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Create the PostgreSQL database

Create a local database named `hirely`, or use another database name in your configuration.

For example:

```sql
CREATE DATABASE hirely;
```

Use a dedicated development database account with only the permissions required by the application.

### 4. Configure server environment variables

Copy the example environment file:

```bash
cp .env.example server/.env
```

On Windows Command Prompt, use:

```cmd
copy .env.example server\.env
```

Edit `server/.env` and configure the database URL, authentication secrets, frontend origin, and other required settings.

Generate independent random secrets for the access-token signing key and refresh-token secret. Each should contain at least 32 characters where required by the application's validation.

Do not commit `.env`, `.env.local`, or any file containing real credentials.

### 5. Configure Google sign-in (optional)

Create `client/.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
```

Configure the same OAuth client ID on the server:

```env
GOOGLE_CLIENT_ID=your_google_web_client_id
```

Add the local frontend origin, `http://localhost:5173`, to the authorized JavaScript origins in Google Cloud Console.

Google sign-in remains unavailable until the client and server are configured with matching IDs.

### 6. Run database migrations

From the repository root:

```bash
npm run migrate -w server
```

Ensure that the server environment file exists and that the migration command loads environment variables from the expected working directory.

### 7. Start the application

```bash
npm run dev
```

Open the frontend at:

- Frontend: [http://localhost:5173](http://localhost:5173)
- API health check: [http://localhost:4000/api/health](http://localhost:4000/api/health)

The health endpoint should return a successful response when the server is running.

## Environment Configuration

The following variables are used by the documented features. Confirm the exact required variables and defaults in `.env.example` and the server configuration before deployment.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Access JWT signing secret |
| `REFRESH_TOKEN_SECRET` | Reserved refresh-token configuration; not currently used by the token helper |
| `CLIENT_ORIGIN` | Allowed frontend origin, such as `http://localhost:5173` |
| `NODE_ENV` | Runtime environment; use `production` for production deployment |
| `GOOGLE_CLIENT_ID` | Optional backend Google ID token audience |
| `AI_PROVIDER` | AI provider selection: `gemini` or `openai` |
| `GEMINI_API_KEY` | Optional Gemini API key |
| `GEMINI_MODEL` | Optional Gemini model override |
| `OPENAI_API_KEY` | Optional OpenAI API key |
| `OPENAI_MODEL` | Optional OpenAI model override |
| `MAX_UPLOAD_SIZE` | Optional upload-size limit in bytes; defaults to 10 MiB when unset |

Frontend Google configuration uses `VITE_GOOGLE_CLIENT_ID`.

Only variables intentionally designed for frontend use should have the `VITE_` prefix. Never put database credentials, JWT signing secrets, refresh-token secrets, or AI provider API keys in client-side environment variables.

**Refresh-token note:** Opaque refresh tokens are hashed with SHA-256 before database storage. `REFRESH_TOKEN_SECRET` is currently reserved and is not used by the token helper. Do not assume it provides additional cryptographic protection until the implementation actually uses it.

## Authentication and Security

### Email and password authentication

- Email addresses are normalized to lowercase.
- Email uniqueness is enforced in PostgreSQL.
- Passwords require at least 10 characters, including uppercase, lowercase, numeric, and symbol characters.
- Passwords are hashed using bcrypt with a cost factor of 12.
- Invalid login attempts return a generic credentials error.

### Session management

- Access JWTs are short-lived and stored in an HttpOnly cookie.
- Opaque refresh tokens are stored in a separate HttpOnly cookie.
- Only SHA-256 hashes of refresh tokens are stored in the database.
- Refresh requests rotate tokens.
- Sessions can be revoked server-side.
- `GET /api/auth/me` restores the current account.
- Authentication tokens must not be placed in `localStorage`.

Clients must send cookies with API requests. For example:

```javascript
// Axios
axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true,
});
```

Use the repository's centralized Axios instance rather than creating duplicate instances throughout the application.

### Google sign-in

Google ID tokens are verified on the backend against `GOOGLE_CLIENT_ID`. Verification includes the token's validity and verified-email claim.

Existing password accounts are not automatically linked to Google accounts solely because their email addresses match.

### Origin and cookie protections

- Cookies use `SameSite=Lax` as documented by the current implementation.
- Production requires HTTPS and appropriate secure-cookie settings.
- State-changing browser requests are rejected when their `Origin` differs from `CLIENT_ORIGIN`.
- Credentialed CORS is configured for the frontend.
- Requests without an `Origin` header remain allowed for server-to-server clients.

This origin policy requires a deployment-specific review. Validate CSRF protections, reverse-proxy behavior, allowed origins, cookie domains, and any multi-origin deployment before launch. An absent `Origin` header must not be treated as proof that a request is trusted.

## API Overview

The API uses JSON unless otherwise specified.

Successful JSON responses use a `data` envelope. Errors use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A safe, user-readable error message"
  }
}
```

Authenticated requests use HttpOnly cookies. Resource ownership is derived from the verified server-side session; clients must not submit user IDs to authorize access.

### Authentication and health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register with `fullName`, `email`, `password`, and `confirmPassword` |
| POST | `/api/auth/login` | Authenticate with `email` and `password` |
| POST | `/api/auth/google` | Verify a Google ID token supplied as `credential` |
| POST | `/api/auth/refresh` | Rotate the refresh token and reissue the access cookie |
| POST | `/api/auth/logout` | Revoke the current session and clear cookies |
| GET | `/api/auth/me` | Restore the authenticated user's profile |
| PATCH | `/api/auth/profile` | Update the authenticated user's display name using `{ "fullName": "..." }` |

### Resume endpoints

All resume endpoints require authentication.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/resumes` | List the current user's resumes |
| POST | `/api/resumes` | Create a structured resume |
| GET | `/api/resumes/:id` | Retrieve an owned resume |
| PUT | `/api/resumes/:id` | Replace the structured resume document |
| DELETE | `/api/resumes/:id` | Delete an owned resume |
| POST | `/api/resumes/import` | Import a PDF, DOCX, or TXT resume |
| GET | `/api/resumes/:id/export/pdf` | Download the saved resume as PDF |
| GET | `/api/resumes/:id/export/docx` | Download the saved resume as DOCX |
| POST | `/api/resumes/:id/optimize` | Analyze an owned resume against a job description |

Resume JSON uses camelCase fields, including `personalInformation`, `professionalSummary`, `resumeData`, `preferredFormat`, `sectionOrder`, `sectionVisibility`, and `customSectionConfiguration`.

The complete request schemas, response contracts, status codes, and error codes should be maintained in the API reference and verified against the route handlers.

## Resume Import and Export

### Import

From the dashboard, choose **Import existing resume** and select a PDF, DOCX, or TXT file.

The server extracts text in memory, uses heuristic parsing to create a structured draft, and opens the editor for review.

- Default maximum upload size: 10 MiB.
- The original file is not persisted by the import service.
- Text-based PDFs are supported.
- Scanned or image-only PDFs are not OCR-processed.
- Parsing may misidentify names, dates, links, headings, or section placement.
- Imported content should be reviewed before saving or exporting.

Documented import errors include `FILE_REQUIRED`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `EMPTY_RESUME_TEXT`, and `UNREADABLE_RESUME`.

### Export

PDF files are generated using PDFKit. Editable DOCX files are generated using the `docx` package.

Exports use the last saved resume version, respect configured section visibility and standard section order, and may span multiple pages.

Visual rendering, page breaks, margins, hyperlinks, and multi-page output still require verification using actual document readers.

## AI Job-Match Analysis

### Endpoint

`POST /api/resumes/:id/optimize`

The endpoint accepts a saved resume ID and a job description.

Example request:

```json
{
  "jobDescription": "Paste the target job description here..."
}
```

The job description must contain at least 80 characters and no more than 16,000 characters.

### Provider configuration

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

Model overrides are optional if the application supplies supported defaults.

### Analysis results

The response contains an estimated match score, matched-skill evidence, potential gaps, bullet improvements, strengths, and a learning plan.

- Requests are rate-limited to 10 per 15 minutes per client IP.
- Resume ownership is verified before analysis.
- AI output is normalized and validated before reaching the frontend.
- Malformed model output should be handled safely.
- Analysis does not directly change the saved resume.
- Suggested skills must not be presented as qualifications the user already possesses.
- Job descriptions are untrusted input and must not override system instructions.

The match score is an estimate, not a guarantee of an applicant tracking system's score or an employer's decision. Provider usage may incur costs.

## Theme and User Interface

Hirely uses a warm editorial visual system featuring ivory surfaces, ink typography, terracotta accents, muted olive details, and serif display headings.

Dark mode retains the same design language with appropriate contrast. The header toggle stores the selected preference in browser `localStorage` and preserves it across navigation and refresh.

Resume preview paper remains white to preserve professional print and export styling.

The main UI routes include the landing page, registration, login, dashboard, resume editor, resume optimizer, profile settings, and not-found page.

## Development Commands

Run these commands from the repository root:

```bash
# Install dependencies
npm install

# Apply database migrations
npm run migrate -w server

# Start frontend and backend development processes
npm run dev

# Run the complete server test suite
npm test -w server

# Build the production frontend
npm run build -w client

# Run all root-configured tests, if supported by the root scripts
npm test
```

The root `npm test` command depends on the scripts defined in `package.json`. Verify that it executes the intended suites rather than assuming it runs every test.

To run the focused parser and AI response-normalization tests:

```bash
cd server
node --test tests/resume-import.test.js tests/optimization-response.test.js
```

## Testing and Quality Assurance

Two focused unit-test groups have been recorded as passing:

- Resume-import parser tests.
- AI response-normalization tests.

These results do not establish that the entire application works end to end.

Remaining verification includes:

- Complete server test suite.
- Production frontend build.
- PostgreSQL migrations against a disposable database.
- API integration tests with authenticated test users.
- Cross-user resume ownership tests.
- Authentication, refresh-token rotation, and session revocation tests.
- AI provider contract, timeout, outage, and malformed-response tests.
- PDF/DOCX document integrity and visual inspection.
- Responsive UI, keyboard navigation, accessibility, and theme persistence.
- CSRF, CORS, HTTPS, and production deployment review.

Use [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) as the authoritative release-verification checklist.

## Current Limitations

- Full integration, accessibility, and visual regression testing remains incomplete.
- PostgreSQL integration and migration verification must be completed in a test environment.
- AI analysis requires valid provider credentials and has not been fully verified end to end.
- Google sign-in requires matching client IDs and authorized origins.
- Automatic linking of existing password accounts to Google accounts is intentionally not implemented.
- Resume import uses heuristic parsing and does not include OCR for scanned PDFs.
- Resume exports require actual-reader and multi-page rendering verification.
- Strict duplicate detection for resume entries remains future work.
- A true paginated live preview remains future work.
- Production deployment hardening and security review remain incomplete.

Dependency installation previously timed out in the build environment. No claim is made that the full frontend build, PostgreSQL integration tests, live AI calls, or document rendering has passed.

## Project Progress

- [x] Inspect the workspace and reference DOCX.
- [x] Establish the React/Vite and Bootstrap application structure.
- [x] Add the initial PostgreSQL migration and ownership-related schema.
- [x] Implement email registration and login with bcrypt and validation.
- [x] Implement HttpOnly access/refresh cookies and server-managed sessions.
- [x] Add Google ID token verification on the backend.
- [x] Add the centralized Axios instance and protected-route/session restoration flow.
- [x] Add profile display-name management.
- [x] Wire the Google Identity Services browser button.
- [x] Implement persisted resume CRUD and dashboard functionality.
- [x] Add the structured resume editor and section ordering/visibility controls.
- [x] Add an A4-oriented preview and initial PDF/DOCX export endpoints.
- [x] Add PDF/DOCX/TXT import and heuristic text extraction.
- [x] Add Gemini/OpenAI provider selection and job-match analysis.
- [x] Add persistent light/dark theme preferences.
- [x] Add resume-import and AI response-normalization unit tests.
- [ ] Complete integration, provider-contract, accessibility, and rendering tests.
- [ ] Complete production security and deployment review.

A checked item records the reported implementation status; it does not replace the separate QA evidence required for release approval.

## Production Readiness

**Hirely is not yet production-ready.**

Before release:

1. Complete all release-blocking automated and integration tests.
2. Verify authentication, ownership enforcement, and session security.
3. Validate migrations and database recovery procedures.
4. Inspect PDF and DOCX output in actual document readers.
5. Verify AI provider failure handling and evidence-grounded recommendations.
6. Complete responsive UI and accessibility checks.
7. Configure production secrets, HTTPS, cookies, CORS, and CSRF protections.
8. Resolve release-blocking security findings and regressions.
9. Record the tested commit, test results, outstanding issues, and release decision.

Do not mark a feature or test complete solely because its code exists. Release status must reflect verified behavior in the target environment.