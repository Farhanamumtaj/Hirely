
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  registerController,
  loginController,
  googleController,
  refreshController,
  logoutController,
  meController,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { updateProfileController } from "../controllers/profileController.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication attempts. Please wait and try again.",
    },
  },
});

router.post("/register", authLimiter, registerController);
router.post("/login", authLimiter, loginController);
router.post("/google", authLimiter, googleController);

router.post("/refresh", authLimiter, refreshController);
router.post("/logout", requireAuth, logoutController);
router.get("/me", requireAuth, meController);
router.patch("/profile", requireAuth, updateProfileController);

export default router;
