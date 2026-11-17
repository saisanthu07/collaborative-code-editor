import { Router } from "express";
import * as roomController from "../controllers/roomController.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import { roomAccessMiddleware, requireRoomHost, requireRole } from "../middleware/roomAccessMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { executeLimiter } from "../middleware/rateLimiter.js";
import {
  createRoomSchema,
  updateRoomSchema,
  executeSchema,
  createFileSchema,
  renameFileSchema,
  saveFileSchema,
  permissionChangeSchema,
  getMessagesQuerySchema,
} from "../validators/roomValidators.js";

const router = Router();

router.post("/", authMiddleware, validateRequest(createRoomSchema), roomController.create);
router.get("/", authMiddleware, roomController.listMine);

router.get("/:roomId", optionalAuthMiddleware, roomAccessMiddleware, roomController.getOne);
router.patch(
  "/:roomId",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  validateRequest(updateRoomSchema),
  roomController.update
);
router.delete("/:roomId", authMiddleware, roomAccessMiddleware, requireRoomHost, roomController.remove);

router.post("/:roomId/join", optionalAuthMiddleware, roomAccessMiddleware, roomController.join);
router.post("/:roomId/leave", optionalAuthMiddleware, roomAccessMiddleware, roomController.leave);
router.post("/:roomId/star", authMiddleware, roomAccessMiddleware, roomController.star);

router.get(
  "/:roomId/messages",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  validateRequest(getMessagesQuerySchema, "query"),
  roomController.getMessages
);

router.post(
  "/:roomId/execute",
  executeLimiter,
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  validateRequest(executeSchema),
  roomController.execute
);

// File management (restricted to HOST and EDITOR)
router.get("/:roomId/files", optionalAuthMiddleware, roomAccessMiddleware, roomController.listFiles);
router.post(
  "/:roomId/files",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  validateRequest(createFileSchema),
  roomController.createFile
);
router.put(
  "/:roomId/files/:fileName",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  validateRequest(saveFileSchema),
  roomController.saveFile
);
router.patch(
  "/:roomId/files/:fileName",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  validateRequest(renameFileSchema),
  roomController.renameFile
);
router.delete(
  "/:roomId/files/:fileName",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  roomController.deleteFile
);

// Host-only member/permission management
router.patch(
  "/:roomId/members/permission",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  validateRequest(permissionChangeSchema),
  roomController.changeMemberPermission
);
router.delete(
  "/:roomId/members/:username",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  roomController.removeMember
);

export default router;
