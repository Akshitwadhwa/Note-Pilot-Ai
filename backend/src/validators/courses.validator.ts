import { z } from "zod";

export const createCourseSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

export const deleteCourseParamsSchema = z.object({
  courseId: z.string().min(1)
});

export const getCourseParamsSchema = z.object({
  courseId: z.string().min(1)
});

export const askCourseQuestionSchema = z.object({
  question: z.string().trim().min(1).max(2000)
});
