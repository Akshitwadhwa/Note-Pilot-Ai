import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional()
});
