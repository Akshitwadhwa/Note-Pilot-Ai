import { Router } from "express";

import { createTimetable, getCurrentClass, listTimetable } from "../controllers/timetable.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { createTimetableSchema } from "../validators/timetable.validator";

const router = Router();

router.get("/", authMiddleware, listTimetable);
router.get("/current", authMiddleware, getCurrentClass);
router.post("/", authMiddleware, validate(createTimetableSchema), createTimetable);

export default router;
