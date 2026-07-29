import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
    },
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        details: err.flatten(),
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      message: "Internal server error",
    },
  });
}
