import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listController,
  getController,
  createController,
  updateController,
  deleteController,
} from "../controllers/resumeController.js";
import {
  exportPdfController,
  exportDocxController,
} from "../controllers/resumeExportController.js";
import { optimizationController } from "../controllers/optimizationController.js";
import {
  importResumeController,
  parseResumeUpload,
} from "../controllers/resumeImportController.js";
import rateLimit from "express-rate-limit";
import { tailoredResumeController } from "../controllers/tailoredResumeController.js";
const optimizationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message:
        "Too many optimization requests. Please wait before trying again.",
    },
  },
});
const router = Router();
router.use(requireAuth);
router.get("/", listController);
router.post("/", createController);
router.post("/import", parseResumeUpload, importResumeController);
router.post("/:id/optimize", optimizationLimiter, optimizationController);
router.get("/:id/export/pdf", exportPdfController);
router.get("/:id/export/docx", exportDocxController);
router.post(
  "/:id/generate-tailored",
  optimizationLimiter,
  tailoredResumeController,
);
router.get("/:id", getController);
router.put("/:id", updateController);
router.delete("/:id", deleteController);

export default router;
