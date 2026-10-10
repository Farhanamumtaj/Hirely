#Hirely

Hirely is being built as a full-stack resume builder and evidence-based job-match assistant. The repository now contains the main application foundations: authentication, resume CRUD/editor, PDF/DOCX export, resume import, AI job-match analysis, and a persistent dark/light theme toggle. It is **not yet production-ready**; see `docs/QA_CHECKLIST.md` for the remaining integration and release checks.

## Reference resume inspected

`Farhana_Mumtaj_Resume_ATS.docx` was inspected from the user library. The default document renderer should follow its A4 portrait page, 0.5-inch margins, centered 18 pt name, centered contact lines, uppercase bold ~11 pt section headings, compact spacing, single-column content, bold skill labels, and simple bullets. The reference document itself is not copied into this repository because it contains personal information; use the original file locally when implementing rendering tests.

## Architecture

- `client/`: React 18, Vite, React Router, Bootstrap 5, Bootstrap Icons, centralized Axios instance, auth context and protected route.
- `server/`: Express REST API, validation schemas, auth service, auth middleware, PostgreSQL access layer, migration and tests.
- `server/migrations/001_initial_schema.sql`: users, server-managed auth sessions, resumes, analyses, versions, uploads and migration tracking.
- PostgreSQL `JSONB` stores the evolving structured resume sections and presentation configuration. This avoids a migration for each custom section; identity, ownership, sessions, and version relations remain relational and constrained.

## Requirements

- Node.js 20+ recommended (Node 22 is fine).
- PostgreSQL 14+.
- Optional Google OAuth client ID for Google Identity Services. Set the same ID in the frontend and backend environments to enable the browser button.
- Gemini or OpenAI API key for the later AI phase.

## Local setup

1. Create a PostgreSQL database, for example `hirely`.
2. Copy `.env.example` to `server/.env` and fill in `DATABASE_URL`, a unique `JWT_ACCESS_SECRET` (at least 32 characters), `REFRESH_TOKEN_SECRET` (use a separate random secret), and `CLIENT_ORIGIN=http://localhost:5173`. Opaque refresh tokens are hashed with SHA-256 before storage; `REFRESH_TOKEN_SECRET` remains reserved and is not currently used by the token helper.
3. If enabling Google sign-in, create `client/.env.local` with `VITE_GOOGLE_CLIENT_ID=your_google_web_client_id` and set `GOOGLE_CLIENT_ID` to the same value in `server/.env`. Add `http://localhost:5173` to the authorized JavaScript origins in Google Cloud Console.
4. From the repository root run `npm install`.
5. Run the migration with `npm run migrate -w server` (from root, load env with `cp .env.example server/.env`; environment variables are read by dotenv from the server working directory when running the workspace script).
6. Start both processes with `npm run dev`.
7. Open `http://localhost:5173`; API health check: `http://localhost:4000/api/health`.

### Authentication behavior

- Email is normalized to lowercase and unique in PostgreSQL.
- Password policy: at least 10 characters with uppercase, lowercase, number and symbol. bcrypt cost factor is 12.
- Access JWT is short-lived and held in an HttpOnly cookie. Opaque refresh tokens are held in a separate HttpOnly cookie; only their SHA-256 hashes are stored in the database and refresh rotates the token.
- Sessions can be revoked server-side. `/api/auth/me` restores the current account. Do not put tokens in localStorage.
- Cookies use `SameSite=Lax`; production requires HTTPS (`NODE_ENV=production`). The API rejects state-changing browser requests with an `Origin` that differs from `CLIENT_ORIGIN`, in addition to credentialed CORS. Requests without an Origin header remain allowed for server-to-server clients. Review this policy alongside reverse proxies, deployed hostnames, cookie settings, and any multi-origin setup before launch.
- Google ID tokens are verified on the backend against `GOOGLE_CLIENT_ID`, including Google's token validation and verified-email claim. An existing email account is not automatically linked by email alone.

## Commands

```bash
npm install
cp .env.example server/.env
# Edit server/.env and create the PostgreSQL database first
npm run migrate -w server
npm run dev
npm test -w server
npm run build -w client
```

## API currently implemented

- `PATCH /api/auth/profile` — `{ fullName }` (authenticated display-name update)

- `POST /api/auth/register` — `{ fullName, email, password, confirmPassword }`
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/google` — `{ credential }` (backend token verification; configure Google first)
- `POST /api/auth/refresh` — refresh cookie rotation
- `POST /api/auth/logout` — authenticated revocation and cookie clearing
- `GET /api/auth/me` — authenticated session restoration
- `GET /api/health`

Responses use `{ data: ... }` on success and `{ error: { code, message } }` on errors. Auth routes have rate limiting; SQL uses parameters. Resume endpoints include owner-scoped CRUD, export, import, and optimization routes.

## Progress checklist

- [x] Inspect workspace and actual reference DOCX.
- [x] Initial React/Vite + Bootstrap app structure.
- [x] PostgreSQL initial migration and ownership-related schema.
- [x] Email registration/login backend with bcrypt, validation and generic credential failures.
- [x] HttpOnly access/refresh cookies, refresh rotation, session lookup/revocation.
- [x] Google ID token verification endpoint (requires configured client ID).
- [x] Central Axios instance and protected route/session restoration.
- [x] Initial automated validation tests.
- [x] Origin validation for state-changing browser requests (deployment-specific CSRF review still required).
- [x] Profile display-name management; email remains read-only.
- [x] Google Identity Services browser button wiring (requires matching client IDs and authorized origins).
- [x] Persisted resume CRUD and dashboard.
- [x] Structured resume editor, section ordering/visibility, and basic date/email/link validation.
- [x] A4-oriented live preview and initial server-side PDF/DOCX export endpoints (visual/page-break verification remains).
- [x] PDF/DOCX/TXT import and heuristic text extraction (review required; scanned PDFs are not OCR-processed).
- [x] Gemini/OpenAI provider selection and evidence-grounded job-description analysis (requires a configured API key).
- [x] Persistent dark/light theme toggle in the header navigation.
- [x] Unit tests for resume-import parsing and AI response normalization.
- [ ] Full integration, provider contract, accessibility, and rendering tests.

## Known limitations

The UI includes the editorial landing page, registration, login, dashboard, resume editor, resume optimizer, document import, profile settings, and not-found routes. Google browser sign-in is wired but requires client configuration; safe Google linking to an existing password account is intentionally not implemented. Production deployment hardening and integration verification remain incomplete. AI analysis and the persistent dark/light theme toggle have been added, but require provider credentials and full integration testing. Saved resume CRUD and initial PDF/DOCX exports are implemented, but they still need full integration and visual rendering tests. Do not treat the app as production-ready until those phases and security tests are finished.

## Resume CRUD implementation status
The authenticated resume API supports list, create, retrieve, update, and delete against PostgreSQL. The dashboard uses those APIs and the initial resume editor saves structured data with a live A4-proportioned preview. The editor currently covers personal details, summary, skill categories, education, experience, projects, achievements, and certifications. The editor has section ordering/visibility controls, basic validation, and server-side PDF/DOCX exports. Strict duplicate detection, a true paginated live preview, and automated visual/page-break verification remain future work.

### Resume editor and export capabilities (Phase 3–4)
- Reorder standard resume sections and toggle their visibility in the live preview.
- Validate email syntax, HTTPS profile links, and comparable `YYYY-MM` date ranges before saving.
- Download server-generated PDF and editable DOCX files from saved resume data; the PDF uses PDFKit and the DOCX uses the `docx` package.
- Print the live preview from the browser when desired.
- The one-page preference uses compact typography; content may still span multiple pages. Visual output, page breaks, and browser download behavior must be tested after dependencies are installed.


### Phase 5: AI job-match analysis and theme toggle
- Header sun/moon control switches between light and dark themes; preference is stored in browser local storage and follows navigation/refresh. Resume paper remains white for readable print/export styling.
- `POST /api/resumes/:id/optimize` compares an owned saved resume against a pasted job description. Requires at least 80 characters, is rate-limited to 10 requests per 15 minutes, and sends relevant resume evidence to the configured AI provider.
- Set `AI_PROVIDER=gemini` with `GEMINI_API_KEY`, or `AI_PROVIDER=openai` with `OPENAI_API_KEY`. Provider secrets stay on the server.
- Results include an estimated match score, evidence for matched skills, potential gaps, grounded bullet suggestions, strengths, and learning ideas. The prompt forbids inventing qualifications or adding missing skills to the resume. Always verify AI output. The score is an estimate, not an ATS guarantee; provider usage may incur costs.

## Importing an existing resume

From the dashboard, choose **Import existing resume** and select a PDF, DOCX, or TXT file. The server extracts text in memory, creates a draft resume, and opens the editor. The original file is not stored. Import parsing is heuristic and should be reviewed before exporting; scanned/image-only PDFs are not OCR-processed. The upload limit defaults to 10 MiB and can be changed with `MAX_UPLOAD_SIZE`.

## Tests

Run `npm test` from the project root after installing dependencies. The server test suite includes authentication and resume-input validation plus pure resume-text parsing tests. Full integration tests require a configured PostgreSQL database and are not implied by these unit tests.

### Editorial UI and account settings

- The frontend uses a warm editorial visual system: ivory paper, ink typography, terracotta accents, muted olive details, and serif display headings. Dark mode uses the same design language with accessible contrast; resume paper remains white for print/export.
- The header theme toggle persists the selected theme. Profile settings allow the signed-in user to update their display name; the email is read-only.
- Google sign-in is rendered using Google Identity Services when `VITE_GOOGLE_CLIENT_ID` is configured. Configure the same audience on the server as `GOOGLE_CLIENT_ID`.

## Phase 7 quality assurance

- AI provider responses are parsed and normalized by `server/src/services/optimizationResponse.js` before they reach the UI. Text fields and lists are bounded, malformed JSON is rejected, and match scores are clamped to 0–100.
- Run the import and AI response unit tests with `cd server && node --test tests/resume-import.test.js tests/optimization-response.test.js`.
- Follow `docs/QA_CHECKLIST.md` for full release verification. Dependency installation timed out in the build environment, so no claim is made that the full frontend build, PostgreSQL integration, live AI calls, or document rendering has passed.
