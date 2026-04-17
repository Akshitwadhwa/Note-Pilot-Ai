import { Router } from "express";
import multer from "multer";

import {
  askCourseQuestionController,
  createCourseController,
  deleteCourseController,
  getCourseDetailController,
  listCoursesController,
  uploadCourseDocumentController
} from "../controllers/courses.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  askCourseQuestionSchema,
  createCourseSchema,
  deleteCourseParamsSchema,
  getCourseParamsSchema
} from "../validators/courses.validator";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get("/", authMiddleware, listCoursesController);
router.get(
  "/:courseId",
  authMiddleware,
  validate(getCourseParamsSchema, "params"),
  getCourseDetailController
);
router.post(
  "/:courseId/documents",
  authMiddleware,
  upload.single("file"),
  validate(getCourseParamsSchema, "params"),
  uploadCourseDocumentController
);
router.post(
  "/:courseId/ask",
  authMiddleware,
  validate(getCourseParamsSchema, "params"),
  validate(askCourseQuestionSchema),
  askCourseQuestionController
);
router.post("/", authMiddleware, validate(createCourseSchema), createCourseController);
router.delete(
  "/:courseId",
  authMiddleware,
  validate(deleteCourseParamsSchema, "params"),
  deleteCourseController
);

export default router;
