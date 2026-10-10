import { resumeIdSchema } from "../validators/resumes.js";
import { optimizationSchema } from "../validators/optimization.js";
import { getResume, createResume } from "../services/resumeService.js";
import { generateTailoredResume } from "../services/tailoredResumeService.js";
import { apiError, asyncHandler } from "../utils/http.js";

export const tailoredResumeController = asyncHandler(async (req, res) => {
  const id = resumeIdSchema.safeParse(req.params.id);

  if (!id.success) {
    return apiError(res, 400, "INVALID_RESUME_ID", "The resume ID is invalid.");
  }

  const body = optimizationSchema.safeParse(req.body);

  if (!body.success) {
    return apiError(
      res,
      400,
      "VALIDATION_ERROR",
      body.error.issues[0]?.message || "Please check the job description.",
    );
  }

  const original = await getResume(req.auth.userId, id.data);

  if (!original) {
    return apiError(res, 404, "RESUME_NOT_FOUND", "This resume was not found.");
  }

  const tailoredData = await generateTailoredResume(
    original,
    body.data.jobDescription,
  );

  // Create a new record. Never update the original resume.
  const resume = await createResume(req.auth.userId, tailoredData);

  return res.status(201).json({
    data: {
      resume,
      originalResumeId: original.id,
    },
  });
});
