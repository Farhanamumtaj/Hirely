import { getResume } from "../services/resumeService.js";
import {
  createDocx,
  createPdf,
  safeFilename,
} from "../services/documentExportService.js";
import { resumeIdSchema } from "../validators/resumes.js";
import { apiError, asyncHandler } from "../utils/http.js";

async function loadOwnedResume(req, res) {
  const parsed = resumeIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    apiError(res, 400, "INVALID_RESUME_ID", "The resume ID is invalid.");
    return null;
  }
  const resume = await getResume(req.auth.userId, req.params.id);
  if (!resume)
    apiError(res, 404, "RESUME_NOT_FOUND", "This resume was not found.");
  return resume;
}

export const exportPdfController = asyncHandler(async (req, res) => {
  const resume = await loadOwnedResume(req, res);
  if (!resume) return;
  const buffer = await createPdf(resume);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(resume.title, "pdf")}"`,
  );
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});

export const exportDocxController = asyncHandler(async (req, res) => {
  const resume = await loadOwnedResume(req, res);
  if (!resume) return;
  const buffer = await createDocx(resume);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(resume.title, "docx")}"`,
  );
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});
