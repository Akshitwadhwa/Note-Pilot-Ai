import { NextFunction, Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import {
  analyzeGoogleClassroomMaterial,
  buildGoogleClassroomErrorRedirect,
  completeGoogleClassroomOAuthFromCallback,
  generateGoogleClassroomMaterialQuiz,
  generateGoogleClassroomQuizPrep,
  getGoogleClassroomDashboardSummary,
  getGoogleClassroomMaterialDetail,
  getGoogleClassroomAuthUrl,
  getGoogleClassroomStatus,
  listGoogleClassroomMaterials,
  submitGoogleClassroomQuizAttempt,
  syncGoogleClassroom
} from "../services/google-classroom.service";

export async function getGoogleClassroomAuthUrlController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await getGoogleClassroomAuthUrl(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function googleClassroomOAuthCallbackController(
  req: Request,
  res: Response
): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (!code || !state) {
    res.redirect(buildGoogleClassroomErrorRedirect("Missing OAuth callback code/state"));
    return;
  }

  try {
    const { redirectUrl } = await completeGoogleClassroomOAuthFromCallback(code, state);
    res.redirect(redirectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Classroom connection failed";
    res.redirect(buildGoogleClassroomErrorRedirect(message));
  }
}

export async function getGoogleClassroomStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await getGoogleClassroomStatus(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function syncGoogleClassroomController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await syncGoogleClassroom(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getGoogleClassroomDashboardSummaryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await getGoogleClassroomDashboardSummary(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function listGoogleClassroomMaterialsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await listGoogleClassroomMaterials(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getGoogleClassroomMaterialDetailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const materialIdRaw = req.params.materialId;
    const materialId = Array.isArray(materialIdRaw) ? materialIdRaw[0] : materialIdRaw;
    if (!materialId) {
      throw new AppError("materialId is required", 422);
    }

    const data = await getGoogleClassroomMaterialDetail(userId, materialId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function analyzeGoogleClassroomMaterialController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const materialIdRaw = req.params.materialId;
    const materialId = Array.isArray(materialIdRaw) ? materialIdRaw[0] : materialIdRaw;
    if (!materialId) {
      throw new AppError("materialId is required", 422);
    }

    const data = await analyzeGoogleClassroomMaterial(userId, materialId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function generateGoogleClassroomMaterialQuizController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const materialIdRaw = req.params.materialId;
    const materialId = Array.isArray(materialIdRaw) ? materialIdRaw[0] : materialIdRaw;
    if (!materialId) {
      throw new AppError("materialId is required", 422);
    }

    const requestedQuestionCount =
      typeof req.body?.questionCount === "number" ? req.body.questionCount : Number(req.body?.questionCount);

    const data = await generateGoogleClassroomMaterialQuiz(userId, materialId, requestedQuestionCount);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function generateGoogleClassroomQuizPrepController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const materialIdRaw = req.params.materialId;
    const materialId = Array.isArray(materialIdRaw) ? materialIdRaw[0] : materialIdRaw;
    if (!materialId) {
      throw new AppError("materialId is required", 422);
    }

    const data = await generateGoogleClassroomQuizPrep(userId, materialId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function submitGoogleClassroomQuizAttemptController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const quizIdRaw = req.params.quizId;
    const quizId = Array.isArray(quizIdRaw) ? quizIdRaw[0] : quizIdRaw;
    if (!quizId) {
      throw new AppError("quizId is required", 422);
    }

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const data = await submitGoogleClassroomQuizAttempt(userId, quizId, answers);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
