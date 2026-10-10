CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
 email TEXT NOT NULL, normalized_email TEXT NOT NULL UNIQUE, password_hash TEXT, google_subject TEXT UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (password_hash IS NOT NULL OR google_subject IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 refresh_token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_active_idx ON auth_sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS resumes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL DEFAULT 'Untitled Resume', designation TEXT NOT NULL DEFAULT '', personal_information JSONB NOT NULL DEFAULT '{}'::jsonb,
 professional_summary TEXT NOT NULL DEFAULT '', resume_data JSONB NOT NULL DEFAULT '{}'::jsonb,
 preferred_format TEXT NOT NULL DEFAULT 'standard' CHECK (preferred_format IN ('one-page','standard')),
 section_order JSONB NOT NULL DEFAULT '[]'::jsonb, section_visibility JSONB NOT NULL DEFAULT '{}'::jsonb,
 custom_section_configuration JSONB NOT NULL DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resumes_user_updated_idx ON resumes(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS resume_analyses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL, job_description TEXT NOT NULL,
 original_resume_snapshot JSONB NOT NULL, matching_score NUMERIC(5,2), score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
 matching_skills JSONB NOT NULL DEFAULT '[]'::jsonb, missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
 recommendations JSONB NOT NULL DEFAULT '[]'::jsonb, optimized_resume JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (matching_score IS NULL OR matching_score BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS analyses_user_created_idx ON resume_analyses(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS resume_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE, parent_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
 version_label TEXT NOT NULL DEFAULT 'Saved version', resume_snapshot JSONB NOT NULL,
 source_analysis_id UUID REFERENCES resume_analyses(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resume_versions_resume_idx ON resume_versions(user_id, resume_id, created_at DESC);
CREATE TABLE IF NOT EXISTS uploaded_documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 document_type TEXT NOT NULL CHECK (document_type IN ('resume','job-description')),
 private_storage_reference TEXT NOT NULL, original_filename TEXT NOT NULL, detected_content_type TEXT NOT NULL,
 file_size BIGINT NOT NULL CHECK (file_size > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS uploaded_documents_owner_idx ON uploaded_documents(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
