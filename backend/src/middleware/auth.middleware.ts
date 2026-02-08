import { NextFunction, Request, Response } from "express";

import { supabaseAdmin } from "../lib/supabase";
import { AppError } from "./error.middleware";
import { syncSupabaseUser } from "../services/user.service";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.header("authorization") || req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      throw new AppError("Missing Bearer token", 401);
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError("Invalid or expired token", 401);
    }

    const email = data.user.email;
    if (!email) {
      throw new AppError("Authenticated user does not have an email", 401);
    }

    const appUser = await syncSupabaseUser({
      supabaseId: data.user.id,
      email,
      name: typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : undefined
    });

    req.user = {
      id: appUser.id,
      email: appUser.email,
      supabaseId: data.user.id
    };

    next();
  } catch (error) {
    next(error);
  }
}
