import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type RequestPart = "body" | "query" | "params";

export function validate(schema: ZodSchema, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[part]);
    (req as Request & Record<string, unknown>)[part] = parsed;
    next();
  };
}

export function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({
    success: true,
    data,
  });
}
