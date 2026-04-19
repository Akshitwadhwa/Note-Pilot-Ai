import { Router } from "express";

import {
  askGoogleClassroomMaterialController,
  analyzeGoogleClassroomMaterialController,
  generateGoogleClassroomMaterialQuizController,
  generateGoogleClassroomQuizPrepController,
  getGoogleClassroomDashboardSummaryController,
  getGoogleClassroomMaterialDetailController,
  getGoogleClassroomAuthUrlController,
  getGoogleClassroomStatusController,
  googleClassroomOAuthCallbackController,
  listGoogleClassroomQuizPrepController,
  listGoogleClassroomMaterialsController,
  submitGoogleClassroomQuizAttemptController,
  syncGoogleClassroomController
} from "../controllers/google-classroom.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  askGoogleClassroomMaterialSchema,
  googleClassroomMaterialParamsSchema
} from "../validators/google-classroom.validator";

const router = Router();

router.get("/auth-url", authMiddleware, getGoogleClassroomAuthUrlController);
router.get("/callback", googleClassroomOAuthCallbackController);
router.get("/status", authMiddleware, getGoogleClassroomStatusController);
router.get("/dashboard-summary", authMiddleware, getGoogleClassroomDashboardSummaryController);
router.post("/sync", authMiddleware, syncGoogleClassroomController);
router.get("/quiz-prep", authMiddleware, listGoogleClassroomQuizPrepController);
router.get("/materials", authMiddleware, listGoogleClassroomMaterialsController);
router.get(
  "/materials/:materialId",
  authMiddleware,
  validate(googleClassroomMaterialParamsSchema, "params"),
  getGoogleClassroomMaterialDetailController
);
router.post(
  "/materials/:materialId/analyze",
  authMiddleware,
  validate(googleClassroomMaterialParamsSchema, "params"),
  analyzeGoogleClassroomMaterialController
);
router.post(
  "/materials/:materialId/ask",
  authMiddleware,
  validate(googleClassroomMaterialParamsSchema, "params"),
  validate(askGoogleClassroomMaterialSchema),
  askGoogleClassroomMaterialController
);
router.post(
  "/materials/:materialId/quiz-prep",
  authMiddleware,
  validate(googleClassroomMaterialParamsSchema, "params"),
  generateGoogleClassroomQuizPrepController
);
router.post(
  "/materials/:materialId/quizzes",
  authMiddleware,
  validate(googleClassroomMaterialParamsSchema, "params"),
  generateGoogleClassroomMaterialQuizController
);
router.post("/quizzes/:quizId/attempts", authMiddleware, submitGoogleClassroomQuizAttemptController);

export default router;
