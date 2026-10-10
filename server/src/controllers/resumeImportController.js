import multer from "multer";
import { createResume } from "../services/resumeService.js";
import {
  extractResumeText,
  parseResumeText,
} from "../services/resumeImportService.js";
import { apiError, asyncHandler } from "../utils/http.js";

const maxFileSize =
  Number(process.env.MAX_UPLOAD_SIZE) > 0
    ? Number(process.env.MAX_UPLOAD_SIZE)
    : 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1 },
  fileFilter: (_req, file, callback) => {
    const name = String(file.originalname || "").toLowerCase();
    const allowed =
      name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt");
    if (!allowed)
      return callback(
        Object.assign(new Error("Upload a PDF, DOCX, or TXT resume."), {
          status: 415,
          code: "UNSUPPORTED_FILE_TYPE",
        }),
      );
    callback(null, true);
  },
});

export const parseResumeUpload = upload.single("file");
export const importResumeController = asyncHandler(async (req, res) => {
  if (!req.file)
    return apiError(
      res,
      400,
      "FILE_REQUIRED",
      "Choose a PDF, DOCX, or TXT resume to import.",
    );
  let text;
  try {
    text = await extractResumeText(req.file);
  } catch (error) {
    if (error.status)
      return apiError(
        res,
        error.status,
        error.code || "IMPORT_FAILED",
        error.message,
      );
    return apiError(
      res,
      422,
      "UNREADABLE_RESUME",
      "This file could not be read. Try another text-based PDF, DOCX, or TXT file.",
    );
  }
  const parsed = parseResumeText(text, req.file.originalname);
  const resume = await createResume(req.auth.userId, parsed.resume);
  res
    .status(201)
    .json({
      data: {
        resume,
        import: {
          hasDetectedSections: parsed.hasDetectedSections,
          extractedCharacters: parsed.extractedCharacters,
          warnings: parsed.warnings,
        },
      },
    });
});
