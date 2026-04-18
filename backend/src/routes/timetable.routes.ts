import { Router } from "express";
import multer from "multer";

import {
  createTimetable,
  deleteTimetable,
  getCurrentClass,
  importTimetableImage,
  listTimetable,
  updateTimetable
} from "../controllers/timetable.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createTimetableSchema,
  timetableParamsSchema,
  updateTimetableSchema
} from "../validators/timetable.validator";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get("/", authMiddleware, listTimetable);
router.get("/current", authMiddleware, getCurrentClass);
router.post("/", authMiddleware, validate(createTimetableSchema), createTimetable);
router.post("/import-image", authMiddleware, upload.single("image"), importTimetableImage);
router.put(
  "/:timetableId",
  authMiddleware,
  validate(timetableParamsSchema, "params"),
  validate(updateTimetableSchema),
  updateTimetable
);
router.delete(
  "/:timetableId",
  authMiddleware,
  validate(timetableParamsSchema, "params"),
  deleteTimetable
);

export default router;
