import { Router } from "express";
import * as compilyController from "../controllers/compilyController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { executeLimiter } from "../middleware/rateLimiter.js";
import { executeSchema, executeBatchSchema } from "../validators/roomValidators.js";
import {
  saveSnippetSchema,
  snippetIdParamSchema,
  toggleShareSchema,
  shareSlugParamSchema,
} from "../validators/compilyValidators.js";

const router = Router();

// Public shared snippet lookup (no auth required)
router.get(
  "/public/:slug",
  validateRequest(shareSlugParamSchema, "params"),
  compilyController.getPublicSnippet
);

router.use(authMiddleware);

router.post(
  "/execute",
  executeLimiter,
  validateRequest(executeSchema),
  compilyController.execute
);

router.post(
  "/execute-batch",
  executeLimiter,
  validateRequest(executeBatchSchema),
  compilyController.executeBatch
);

router.get("/snippets", compilyController.listSnippets);
router.post("/snippets", validateRequest(saveSnippetSchema), compilyController.saveSnippet);
router.delete(
  "/snippets/:id",
  validateRequest(snippetIdParamSchema, "params"),
  compilyController.deleteSnippet
);
router.patch(
  "/snippets/:id/share",
  validateRequest(snippetIdParamSchema, "params"),
  validateRequest(toggleShareSchema),
  compilyController.toggleShareSnippet
);
router.post(
  "/public/:slug/fork",
  validateRequest(shareSlugParamSchema, "params"),
  compilyController.forkPublicSnippet
);

export default router;
