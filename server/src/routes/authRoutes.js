import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authLimiter, refreshLimiter } from "../middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema,
} from "../validators/authValidators.js";

const router = Router();

router.post("/register", authLimiter, validateRequest(registerSchema), authController.register);
router.post("/login", authLimiter, validateRequest(loginSchema), authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.post("/logout-all", authMiddleware, authController.logoutAll);
router.post(
  "/forgot-password",
  authLimiter,
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

router.get("/me", authMiddleware, authController.me);
router.patch("/me", authMiddleware, validateRequest(updateProfileSchema), authController.updateProfile);
router.delete("/me", authMiddleware, validateRequest(deleteAccountSchema), authController.deleteMe);
router.patch(
  "/me/password",
  authMiddleware,
  validateRequest(changePasswordSchema),
  authController.updatePassword
);
router.get("/sessions", authMiddleware, authController.sessions);
router.delete("/sessions/:sessionId", authMiddleware, authController.revokeSession);

export default router;
