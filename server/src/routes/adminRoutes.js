import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  userIdParamSchema,
  roomIdParamSchema,
  logIdParamSchema,
  appealIdParamSchema,
  moderationActionSchema,
  reviewAppealSchema,
} from "../validators/adminValidators.js";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/stats", adminController.stats);
router.get("/users", adminController.listUsers);
router.patch(
  "/users/:userId/suspend",
  validateRequest(userIdParamSchema, "params"),
  validateRequest(moderationActionSchema),
  adminController.suspendUser
);
router.patch(
  "/users/:userId/unsuspend",
  validateRequest(userIdParamSchema, "params"),
  adminController.unsuspendUser
);
router.patch(
  "/users/:userId/ban",
  validateRequest(userIdParamSchema, "params"),
  validateRequest(moderationActionSchema),
  adminController.banUser
);
router.patch(
  "/users/:userId/unban",
  validateRequest(userIdParamSchema, "params"),
  adminController.unbanUser
);
router.delete(
  "/users/:userId",
  validateRequest(userIdParamSchema, "params"),
  adminController.deleteUser
);

router.get("/rooms", adminController.listRooms);
router.patch(
  "/rooms/:roomId/lock",
  validateRequest(roomIdParamSchema, "params"),
  adminController.lockRoom
);
router.patch(
  "/rooms/:roomId/unlock",
  validateRequest(roomIdParamSchema, "params"),
  adminController.unlockRoom
);
router.delete(
  "/rooms/:roomId",
  validateRequest(roomIdParamSchema, "params"),
  adminController.deleteRoom
);

router.get("/activity-logs", adminController.activityLogs);
router.delete(
  "/activity-logs/:logId",
  validateRequest(logIdParamSchema, "params"),
  adminController.deleteActivityLog
);
router.delete("/activity-logs", adminController.clearActivityLogs);

router.get("/appeals", adminController.listAppeals);
router.patch(
  "/appeals/:appealId/review",
  validateRequest(appealIdParamSchema, "params"),
  validateRequest(reviewAppealSchema),
  adminController.reviewAppeal
);

export default router;
