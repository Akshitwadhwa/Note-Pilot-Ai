import { Router } from "express";

import { createNoteController, listNotesController, updateNoteController } from "../controllers/notes.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createNoteSchema, noteParamsSchema, updateNoteSchema } from "../validators/notes.validator";

const router = Router();

router.get("/", authMiddleware, listNotesController);
router.post("/", authMiddleware, validate(createNoteSchema), createNoteController);
router.put("/:noteId", authMiddleware, validate(noteParamsSchema, "params"), validate(updateNoteSchema), updateNoteController);

export default router;
