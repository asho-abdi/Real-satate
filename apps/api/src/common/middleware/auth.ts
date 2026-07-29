import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import { getAnonClient } from "../../lib/supabase";
import { AppError } from "../errors/app-error";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
  };
  accessToken?: string;
};

export async function authOptional(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = header.slice("Bearer ".length);
    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      next();
      return;
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
    };
    req.accessToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

export async function authRequired(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!env.REQUIRE_AUTH) {
      next();
      return;
    }

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Missing Bearer access token");
    }

    const token = header.slice("Bearer ".length);
    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError(401, "Invalid or expired access token");
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
    };
    req.accessToken = token;
    next();
  } catch (error) {
    next(error);
  }
}
