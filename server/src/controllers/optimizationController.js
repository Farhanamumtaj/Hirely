import { resumeIdSchema } from "../validators/resumes.js";
import { optimizationSchema } from "../validators/optimization.js";
import { getResume } from "../services/resumeService.js";
import { optimizeResume } from "../services/optimizationService.js";
import { apiError, asyncHandler } from "../utils/http.js";
export const optimizationController = asyncHandler(async (req, res) => {
  const id = resumeIdSchema.safeParse(req.params.id);
  if (!id.success)
    return apiError(res, 400, "INVALID_RESUME_ID", "The resume ID is invalid.");
  const body = optimizationSchema.safeParse(req.body);
  if (!body.success)
    return apiError(
      res,
      400,
      "VALIDATION_ERROR",
      body.error.issues[0]?.message || "Please check the job description.",
    );
  const resume = await getResume(req.auth.userId, id.data);
  if (!resume)
    return apiError(res, 404, "RESUME_NOT_FOUND", "This resume was not found.");
  const analysis = await optimizeResume(resume, body.data.jobDescription);
  res.json({
    data: {
      analysis,
      resumeId: resume.id,
      createdAt: new Date().toISOString(),
    },
  });
});
