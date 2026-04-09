import type { Request, Response } from "express";
import * as response from "./response.ts";
import logger from "../utils/logger.ts";

interface CustomError extends Error {
  statusCode?: number;
  status?: number;
}

function errors(err: CustomError, req: Request, res: Response): void {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Error interno";

  logger.error("Request error", {
    method: req.method,
    path: req.path,
    status,
    message,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  response.error(req, res, message, status);
}

export default errors;
