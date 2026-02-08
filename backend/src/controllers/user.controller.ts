import { NextFunction, Request, Response } from "express";

import { registerOrGetUser } from "../services/user.service";

export async function registerUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await registerOrGetUser(req.body.email, req.body.name);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}
