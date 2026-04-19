import { Router } from "express";

import {
  assistNoteController,
  assistTextController,
  summarizeNoteController,
  summarizeTextController
} from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  assistNoteSchema,
  assistTextSchema,
  summarizeNoteSchema,
  summarizeTextSchema
} from "../validators/notes.validator";

const router = Router();

router.post("/summarize", authMiddleware, validate(summarizeTextSchema), summarizeTextController);
router.post("/assist-text", authMiddleware, validate(assistTextSchema), assistTextController);
router.post("/summarize-note", authMiddleware, validate(summarizeNoteSchema), summarizeNoteController);
router.post("/assist-note", authMiddleware, validate(assistNoteSchema), assistNoteController);

export default router;
