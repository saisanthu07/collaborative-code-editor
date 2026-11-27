import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireTrustedOrigin } from "../middleware/csrfOriginMiddleware.js";
import { authLimiter, refreshLimiter } from "../middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  deleteAccountSchema,
  submitAppealSchema,
} from "../validators/authValidators.js";

const router = Router();

router.post("/register", authLimiter, validateRequest(registerSchema), authController.register);
router.post("/login", authLimiter, validateRequest(loginSchema), authController.login);
router.post("/appeal", authLimiter, validateRequest(submitAppealSchema), authController.submitAppeal);
router.post("/refresh", refreshLimiter, requireTrustedOrigin, authController.refresh);
router.post("/logout", requireTrustedOrigin, authController.logout);
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
router.post(
  "/verify-email",
  authLimiter,
  validateRequest(verifyEmailSchema),
  authController.verifyEmail
);
router.post(
  "/resend-verification",
  authLimiter,
  authMiddleware,
  authController.resendVerification
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
