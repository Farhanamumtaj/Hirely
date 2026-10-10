import { pool } from "../config/db.js";
import { profileSchema } from "../validators/profile.js";
import { apiError, asyncHandler } from "../utils/http.js";
import { safeUser } from "../services/authService.js";

export const updateProfileController = asyncHandler(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success)
    return apiError(
      res,
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message || "Please check your profile details.",
    );
  const result = await pool.query(
    "UPDATE users SET full_name=$1, updated_at=now() WHERE id=$2 RETURNING id,full_name,email,created_at",
    [parsed.data.fullName, req.auth.userId],
  );
  if (!result.rowCount)
    return apiError(
      res,
      404,
      "USER_NOT_FOUND",
      "Your account could not be found. Please sign in again.",
    );
  return res.json({ data: { user: safeUser(result.rows[0]) } });
});
