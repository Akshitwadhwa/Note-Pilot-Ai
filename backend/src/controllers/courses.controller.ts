import { NextFunction, Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { askCourseQuestion, uploadCourseDocument } from "../services/course-rag.service";
import { createCourse, deleteCourse, getCourseDetail, listCourses } from "../services/courses.service";

export async function listCoursesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await listCourses(userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createCourseController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await createCourse(userId, req.body.name);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getCourseDetailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
    const data = await getCourseDetail(userId, courseId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deleteCourseController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
    await deleteCourse(userId, courseId);
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
}

export async function uploadCourseDocumentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
    const file = req.file;
    const data = await uploadCourseDocument(userId, courseId, file as Express.Multer.File);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function askCourseQuestionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
    const data = await askCourseQuestion(userId, courseId, req.body.question);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
