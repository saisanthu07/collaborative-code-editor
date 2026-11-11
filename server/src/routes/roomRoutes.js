import { Router } from "express";
import * as roomController from "../controllers/roomController.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import { roomAccessMiddleware, requireRoomHost } from "../middleware/roomAccessMiddleware.js";
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
router.post("/:roomId/star", authMiddleware, roomAccessMiddleware, roomController.star);

router.get("/:roomId/messages", optionalAuthMiddleware, roomAccessMiddleware, roomController.getMessages);

router.post(
  "/:roomId/execute",
  executeLimiter,
  optionalAuthMiddleware,
  roomAccessMiddleware,
  validateRequest(executeSchema),
  roomController.execute
);

// File management
router.get("/:roomId/files", optionalAuthMiddleware, roomAccessMiddleware, roomController.listFiles);
router.post(
  "/:roomId/files",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  validateRequest(createFileSchema),
  roomController.createFile
);
router.put(
  "/:roomId/files/:fileName",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  validateRequest(saveFileSchema),
  roomController.saveFile
);
router.patch(
  "/:roomId/files/:fileName",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  validateRequest(renameFileSchema),
  roomController.renameFile
);
router.delete("/:roomId/files/:fileName", optionalAuthMiddleware, roomAccessMiddleware, roomController.deleteFile);

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
