import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

import { AppError } from "./error.middleware";

type Source = "body" | "params" | "query";

export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const payload = req[source];
    const result = schema.safeParse(payload);

    if (!result.success) {
      const firstError = result.error.issues[0]?.message ?? "Invalid request";
      next(new AppError(firstError, 422));
      return;
    }

    req[source] = result.data;
    next();
  };
}
