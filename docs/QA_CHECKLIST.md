# Hirely Phase 7 — Integration and release QA checklist

This checklist is intended to be completed on a machine with Node.js 20+, installed npm dependencies, and PostgreSQL 14+. A checkbox is not marked complete merely because the relevant code exists.

## Automated checks

- [x] Pure resume-import parser tests pass (`node --test tests/resume-import.test.js`).
- [x] AI response-normalization tests pass (`node --test tests/optimization-response.test.js`).
- [ ] Run the complete server test suite (`npm test -w server`) after `npm install`.
- [ ] Run the production frontend build (`npm run build -w client`).
- [ ] Run database migration against a disposable test database.
- [ ] Run API integration tests with PostgreSQL and a test user.
- [ ] Test PDF/DOCX exports by opening the generated files in actual readers.

## Authentication and ownership

- [ ] Register with valid details; confirm email is normalized.
- [ ] Update the profile display name and confirm the new name appears in the header and dashboard.
- [ ] Configure Google Identity Services and test verified-ID-token sign-in.
- [ ] Reject duplicate email, weak password, and mismatched confirmation.
- [ ] Log in with valid credentials; reject invalid credentials without revealing which field failed.
- [ ] Refresh a session; confirm the refresh token rotates and the previous token cannot be reused.
- [ ] Log out; confirm the session is revoked.
- [ ] Verify every resume read, update, delete, import-created record, optimize, and export is scoped to the authenticated owner.
- [ ] Confirm expired, malformed, and absent access cookies are rejected on protected routes.

## Resume CRUD, import, and export

- [ ] Create, read, update, and delete a resume.
- [ ] Confirm invalid UUIDs and oversized/malformed payloads receive consistent JSON errors.
- [ ] Import text-based PDF, DOCX, and TXT files; inspect the draft before saving/exporting.
- [ ] Reject unsupported extensions and oversized uploads.
- [ ] Confirm scanned PDFs without an OCR text layer show a helpful error.
- [ ] Export a short and a long resume to PDF and DOCX; inspect page breaks, missing fields, links, bullets, and A4 margins.
- [ ] Confirm hidden sections are excluded and selected section order is respected.
- [ ] Confirm browser dark mode does not change the white document paper or exported document styling.

## AI optimization and theme

- [ ] Test each provider with a valid key, a missing key, an invalid key, rate limiting, and provider outage.
- [ ] Test malformed model JSON; the API should return a safe 502 response rather than crash.
- [ ] Confirm response fields are normalized and bounded before reaching the frontend.
- [ ] Check that AI suggestions do not silently modify the saved resume.
- [ ] Verify prompt-injection text in a job description is treated as untrusted data.
- [ ] Test light/dark mode on landing, authentication, dashboard, editor, optimizer, errors, and mobile widths.
- [ ] Verify keyboard focus, accessible toggle labels, readable contrast, and persistence after refresh.
- [ ] Inspect editorial layout at mobile, tablet, and desktop breakpoints, including the editor and optimizer.

## Release gate

Do not call the application production-ready until the unchecked automated and security tests are completed, document rendering has been visually inspected, production secrets and HTTPS cookie settings are configured, and a CSRF/deployment review is complete.
