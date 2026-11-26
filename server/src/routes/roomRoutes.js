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
  executeBatchSchema,
  updateTestCasesSchema,
  createFileSchema,
  renameFileSchema,
  saveFileSchema,
  permissionChangeSchema,
  inviteMemberSchema,
  createRevisionSchema,
  createCommentSchema,
  scorecardSchema,
  getMessagesQuerySchema,
} from "../validators/roomValidators.js";

const router = Router();

router.get("/ice-servers", roomController.getIceServers);

router.post("/instant", optionalAuthMiddleware, roomController.createInstant);

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
router.post(
  "/:roomId/invite/rotate",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  roomController.rotateInvite
);
router.post(
  "/:roomId/end",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  roomController.endSession
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

router.post(
  "/:roomId/execute-batch",
  executeLimiter,
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  validateRequest(executeBatchSchema),
  roomController.executeBatch
);

router.put(
  "/:roomId/test-cases",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  validateRequest(updateTestCasesSchema),
  roomController.updateTestCases
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

// Version History / Checkpoints
router.get(
  "/:roomId/files/:fileName/revisions",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  roomController.listRevisions
);
router.post(
  "/:roomId/files/:fileName/revisions",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  validateRequest(createRevisionSchema),
  roomController.createRevision
);
router.post(
  "/:roomId/files/:fileName/revisions/:revisionId/restore",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  roomController.restoreRevision
);

// Inline Code Comments
router.get(
  "/:roomId/comments",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  roomController.listComments
);
router.post(
  "/:roomId/comments",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  validateRequest(createCommentSchema),
  roomController.createComment
);
router.patch(
  "/:roomId/comments/:commentId/resolve",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  requireRole("HOST", "EDITOR"),
  roomController.toggleResolveComment
);
router.delete(
  "/:roomId/comments/:commentId",
  optionalAuthMiddleware,
  roomAccessMiddleware,
  roomController.deleteComment
);

// Host-only Interview Scorecard
router.get(
  "/:roomId/scorecard",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  roomController.getScorecard
);
router.put(
  "/:roomId/scorecard",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  validateRequest(scorecardSchema),
  roomController.updateScorecard
);

// Host-only member/permission & invite management
router.post(
  "/:roomId/members/invite",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  validateRequest(inviteMemberSchema),
  roomController.inviteMember
);
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
router.post(
  "/:roomId/unban/:username",
  authMiddleware,
  roomAccessMiddleware,
  requireRoomHost,
  roomController.unbanMember
);

export default router;
