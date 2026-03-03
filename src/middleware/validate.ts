import type { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const missing = (result.error as ZodError).issues.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      res.status(400).json({ message: "VALIDATION_ERROR", error: missing });
      return;
    }
    req.body = result.data;
    next();
  };
}
