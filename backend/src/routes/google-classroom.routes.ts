import { Router } from "express";

import {
  analyzeGoogleClassroomMaterialController,
  generateGoogleClassroomMaterialQuizController,
  generateGoogleClassroomQuizPrepController,
  getGoogleClassroomDashboardSummaryController,
  getGoogleClassroomMaterialDetailController,
  getGoogleClassroomAuthUrlController,
  getGoogleClassroomStatusController,
  googleClassroomOAuthCallbackController,
  listGoogleClassroomMaterialsController,
  submitGoogleClassroomQuizAttemptController,
  syncGoogleClassroomController
} from "../controllers/google-classroom.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/auth-url", authMiddleware, getGoogleClassroomAuthUrlController);
router.get("/callback", googleClassroomOAuthCallbackController);
router.get("/status", authMiddleware, getGoogleClassroomStatusController);
router.get("/dashboard-summary", authMiddleware, getGoogleClassroomDashboardSummaryController);
router.post("/sync", authMiddleware, syncGoogleClassroomController);
router.get("/materials", authMiddleware, listGoogleClassroomMaterialsController);
router.get("/materials/:materialId", authMiddleware, getGoogleClassroomMaterialDetailController);
router.post("/materials/:materialId/analyze", authMiddleware, analyzeGoogleClassroomMaterialController);
router.post("/materials/:materialId/quiz-prep", authMiddleware, generateGoogleClassroomQuizPrepController);
router.post("/materials/:materialId/quizzes", authMiddleware, generateGoogleClassroomMaterialQuizController);
router.post("/quizzes/:quizId/attempts", authMiddleware, submitGoogleClassroomQuizAttemptController);

export default router;
