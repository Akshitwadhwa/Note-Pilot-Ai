import { Router } from "express";

import { summarizeNoteController, summarizeTextController } from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { summarizeNoteSchema, summarizeTextSchema } from "../validators/notes.validator";

const router = Router();

router.post("/summarize", authMiddleware, validate(summarizeTextSchema), summarizeTextController);
router.post("/summarize-note", authMiddleware, validate(summarizeNoteSchema), summarizeNoteController);

export default router;
