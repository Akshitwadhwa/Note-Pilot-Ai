import { z } from "zod";

export const googleClassroomMaterialParamsSchema = z.object({
  materialId: z.string().min(1)
});

export const askGoogleClassroomMaterialSchema = z.object({
  question: z.string().trim().min(1).max(2000)
});
