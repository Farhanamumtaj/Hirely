import { resumeSchema, resumeIdSchema } from "../validators/resumes.js";
import {
  listResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
} from "../services/resumeService.js";
import { apiError, asyncHandler } from "../utils/http.js";
const bad = (res, p) =>
  apiError(
    res,
    400,
    "VALIDATION_ERROR",
    p.error.issues[0]?.message || "Please check the submitted fields.",
  );
function validId(res, id) {
  const p = resumeIdSchema.safeParse(id);
  if (!p.success) {
    apiError(res, 400, "INVALID_RESUME_ID", "The resume ID is invalid.");
    return false;
  }
  return true;
}
export const listController = asyncHandler(async (req, res) =>
  res.json({ data: { resumes: await listResumes(req.auth.userId) } }),
);
export const getController = asyncHandler(async (req, res) => {
  if (!validId(res, req.params.id)) return;
  const resume = await getResume(req.auth.userId, req.params.id);
  if (!resume)
    return apiError(res, 404, "RESUME_NOT_FOUND", "This resume was not found.");
  res.json({ data: { resume } });
});
export const createController = asyncHandler(async (req, res) => {
  const p = resumeSchema.safeParse(req.body);
  if (!p.success) return bad(res, p);
  const resume = await createResume(req.auth.userId, p.data);
  res.status(201).json({ data: { resume } });
});
export const updateController = asyncHandler(async (req, res) => {
  if (!validId(res, req.params.id)) return;
  const p = resumeSchema.safeParse(req.body);
  if (!p.success) return bad(res, p);
  const resume = await updateResume(req.auth.userId, req.params.id, p.data);
  if (!resume)
    return apiError(res, 404, "RESUME_NOT_FOUND", "This resume was not found.");
  res.json({ data: { resume } });
});
export const deleteController = asyncHandler(async (req, res) => {
  if (!validId(res, req.params.id)) return;
  const deleted = await deleteResume(req.auth.userId, req.params.id);
  if (!deleted)
    return apiError(res, 404, "RESUME_NOT_FOUND", "This resume was not found.");
  res.status(204).end();
});
