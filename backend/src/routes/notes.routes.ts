import { Router } from "express";

import { createNoteController, listNotesController } from "../controllers/notes.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createNoteSchema } from "../validators/notes.validator";

const router = Router();

router.get("/", authMiddleware, listNotesController);
router.post("/", authMiddleware, validate(createNoteSchema), createNoteController);

export default router;
