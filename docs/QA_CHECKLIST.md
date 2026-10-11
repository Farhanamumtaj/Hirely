# Hirely Phase 7 — Integration and Release QA Checklist

This checklist verifies Hirely's integration, security, functionality, accessibility, and release readiness.

## Prerequisites

Run the checks on a machine with:

- Node.js 20 or later.
- npm dependencies installed.
- PostgreSQL 14 or later.
- A disposable test database with the required database credentials.
- Test configuration for authentication, email, Google Identity Services, and AI providers as needed.
- No production credentials or production user data in the test environment.

**Completion policy:** A checkbox may be marked complete only after the corresponding test has been executed and its result verified. The existence of implementation code alone does not constitute a passing test.

## 1. Automated Checks

- [x] Pure resume-import parser tests pass: `node --test tests/resume-import.test.js`.
- [x] AI response-normalization tests pass: `node --test tests/optimization-response.test.js`.
- [ ] Install dependencies and run the complete server test suite: `npm test -w server`.
- [ ] Run the production frontend build: `npm run build -w client`.
- [ ] Apply database migrations against a disposable PostgreSQL test database.
- [ ] Run API integration tests against PostgreSQL using a dedicated test user.
- [ ] Verify migration rollback or recovery procedures where supported.
- [ ] Test PDF and DOCX exports by opening generated files in actual document readers.
- [ ] Review test output and resolve unexpected failures, warnings, and regressions.

## 2. Authentication, Profile, and Ownership

### Registration and login

- [ ] Register with valid details and confirm that email addresses are normalized consistently.
- [ ] Reject duplicate email addresses, weak passwords, and mismatched password confirmations.
- [ ] Verify input validation on the server, independently of client-side validation.
- [ ] Log in with valid credentials.
- [ ] Reject invalid credentials without revealing whether the email or password was incorrect.
- [ ] Verify that password hashes are stored securely and plaintext passwords are never persisted or logged.
- [ ] Configure Google Identity Services and test sign-in using a valid, server-verified Google ID token.
- [ ] Reject invalid, expired, or incorrectly configured Google credentials.

### Profile management

- [ ] Update the profile display name and confirm that the new name appears in the header and dashboard.
- [ ] Verify that profile updates persist after logging out and logging back in.
- [ ] Confirm that unauthorized users cannot update another user's profile.

### Session security

- [ ] Refresh a session and confirm that the refresh token rotates successfully.
- [ ] Confirm that a previously rotated refresh token cannot be reused.
- [ ] Log out and verify that the current session is revoked and authentication cookies are cleared.
- [ ] Reject expired, malformed, and missing access cookies on protected routes.
- [ ] Verify cookie settings for `HttpOnly`, `Secure`, `SameSite`, domain, path, and expiry as appropriate for the deployment.
- [ ] Confirm that refresh tokens and session credentials are not exposed in client-side storage or application logs.

### Resource ownership

- [ ] Verify that every resume read, update, delete, import-created record, optimization request, and export is restricted to the authenticated owner.
- [ ] Attempt cross-user access using another user's resume UUID; confirm that private data cannot be retrieved or modified.
- [ ] Verify that clients cannot bypass ownership checks by supplying or manipulating user IDs.
- [ ] Confirm that unauthorized and unauthenticated requests fail consistently without leaking private information.

## 3. Resume CRUD, Import, and Export

### Resume CRUD

- [ ] Create, read, update, and delete a resume.
- [ ] Confirm that saved resume data and section configuration persist correctly.
- [ ] Verify that invalid UUIDs, malformed JSON, oversized payloads, and schema violations produce consistent JSON errors.
- [ ] Confirm that missing resources and resources owned by another user do not expose private data.
- [ ] Verify that section visibility and ordering are preserved after saving and reloading.

### Resume import

- [ ] Import text-based PDF, DOCX, and TXT files.
- [ ] Review each imported draft before saving or exporting it.
- [ ] Reject unsupported file extensions and oversized uploads.
- [ ] Test empty, corrupted, malformed, and unreadable documents.
- [ ] Confirm that scanned PDFs without an extractable text layer produce a helpful error explaining the OCR limitation.
- [ ] Verify that imported names, dates, links, headings, and section assignments are editable.
- [ ] Confirm that the original upload is not persisted if the implementation promises in-memory processing only.
- [ ] Verify that importing another user's document cannot create or modify records outside the authenticated user's account.

### PDF and DOCX export

- [ ] Export a short resume to PDF and DOCX.
- [ ] Export a long resume to PDF and DOCX.
- [ ] Open the generated files in actual PDF and Word-compatible readers.
- [ ] Inspect page breaks, missing fields, hyperlinks, bullet points, typography, and A4 margins.
- [ ] Confirm that hidden sections are excluded from the export.
- [ ] Confirm that the selected section order is respected.
- [ ] Verify behavior for empty optional sections, long URLs, lengthy bullet points, and unusual but valid input.
- [ ] Confirm that the one-page preference does not cause content to be silently truncated.
- [ ] Confirm that exports use the latest saved resume version.
- [ ] Verify that browser light/dark mode does not change the white resume preview paper or exported document styling.

## 4. AI Optimization and Theme

### AI provider integration

- [ ] Test each configured AI provider with a valid API key.
- [ ] Test missing and invalid API keys.
- [ ] Test rate limiting and provider outages.
- [ ] Test network failures, timeouts, and malformed model responses.
- [ ] Confirm that malformed model JSON produces a safe `502 Bad Gateway` response when that is the documented contract, rather than crashing the server.
- [ ] Verify that response fields are normalized, validated, and bounded before reaching the frontend.
- [ ] Confirm that provider errors do not expose API keys, internal stack traces, or sensitive configuration.
- [ ] Verify that optimization requests are restricted to the authenticated resume owner.
- [ ] Confirm that AI suggestions do not silently modify the saved resume.
- [ ] Verify that missing skills are presented as skill gaps rather than existing qualifications.
- [ ] Test prompt-injection text embedded in job descriptions and ensure it is treated as untrusted input.
- [ ] Confirm that suggested resume improvements remain grounded in the user's actual experience and achievements.

### Theme and visual behavior

- [ ] Test light and dark modes on the landing page, authentication pages, dashboard, resume editor, optimizer, error states, and mobile layouts.
- [ ] Verify keyboard focus indicators and accessible theme-toggle labels.
- [ ] Check readable contrast and text legibility in both themes.
- [ ] Confirm that the selected theme persists after a page refresh.
- [ ] Inspect responsive layouts at mobile, tablet, and desktop breakpoints.
- [ ] Verify editor and optimizer usability at narrow screen widths.
- [ ] Confirm that theme changes do not alter the resume's professional print/export styling.

## 5. Accessibility and User Experience

- [ ] Navigate primary workflows using only the keyboard.
- [ ] Verify visible focus indicators and a logical focus order.
- [ ] Confirm that form fields have accessible labels and validation errors are understandable.
- [ ] Ensure that loading, success, empty, and error states provide clear feedback.
- [ ] Check that dialogs, menus, and interactive controls work with assistive technologies where applicable.
- [ ] Verify that responsive layouts do not introduce horizontal overflow or hide essential actions.
- [ ] Confirm that the application remains usable when AI services are temporarily unavailable.

## 6. Deployment and Security Review

- [ ] Configure production environment variables without committing secrets to version control.
- [ ] Verify production HTTPS and secure cookie settings.
- [ ] Confirm that database credentials follow the principle of least privilege.
- [ ] Review CORS configuration and restrict allowed origins to approved client origins.
- [ ] Review CSRF protections for cookie-authenticated state-changing requests, including refresh and logout behavior.
- [ ] Verify request validation, upload limits, rate limits, and safe error handling.
- [ ] Confirm that authentication secrets and AI provider keys are stored in the deployment platform's secret manager or equivalent secure configuration.
- [ ] Review dependency vulnerabilities and resolve relevant high-risk findings.
- [ ] Verify database backup and recovery procedures.
- [ ] Confirm that logs exclude passwords, tokens, API keys, and unnecessary personal information.
- [ ] Verify that the production frontend build and server startup succeed in the intended deployment environment.

## 7. Release Gate

**Hirely must not be declared production-ready until all release-blocking checks have been completed and their results verified.**

Release approval requires:

- All automated tests and required integration tests pass.
- Database migrations succeed against the intended schema.
- Authentication, refresh-token rotation, session revocation, and cross-user ownership protections are verified.
- Resume CRUD, imports, AI optimization, and document exports work end to end.
- Generated PDF and DOCX documents have been visually inspected.
- Responsive layouts, theme persistence, keyboard navigation, and accessibility checks have been reviewed.
- Production secrets, HTTPS cookie settings, CSRF protections, CORS, and deployment configuration have been reviewed.
- No unresolved release-blocking security defects or critical regressions remain.

### Final release record

- **Test environment:** ____________________
- **Commit / release version:** ____________________
- **Date tested:** ____________________
- **Automated test result:** ____________________
- **Integration test result:** ____________________
- **Security review result:** ____________________
- **Outstanding issues:** ____________________
- **Release decision:** Approved / Blocked
- **Reviewed by:** ____________________

**Status:** Release readiness has not yet been established. The two checked parser and response-normalization tests are recorded as passing; the remaining items require execution and verification.