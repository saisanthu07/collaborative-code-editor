import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/authValidators.js";

const router = Router();

router.post("/register", authLimiter, validateRequest(registerSchema), authController.register);
router.post("/login", authLimiter, validateRequest(loginSchema), authController.login);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.me);
router.patch("/me", authMiddleware, validateRequest(updateProfileSchema), authController.updateProfile);
router.patch(
  "/me/password",
  authMiddleware,
  validateRequest(changePasswordSchema),
  authController.updatePassword
);

export default router;
