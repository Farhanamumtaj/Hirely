ALTER TABLE uploaded_documents
ADD COLUMN IF NOT EXISTS resume_id UUID
REFERENCES resumes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS uploaded_documents_resume_id_idx
ON uploaded_documents(resume_id)
WHERE resume_id IS NOT NULL;