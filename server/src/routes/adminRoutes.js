import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/stats", adminController.stats);
router.get("/users", adminController.listUsers);
router.patch("/users/:userId/suspend", adminController.suspendUser);
router.delete("/users/:userId", adminController.deleteUser);
router.get("/rooms", adminController.listRooms);
router.patch("/rooms/:roomId/lock", adminController.lockRoom);
router.delete("/rooms/:roomId", adminController.deleteRoom);
router.get("/activity-logs", adminController.activityLogs);

export default router;
