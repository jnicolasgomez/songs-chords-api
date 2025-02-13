import type { Request, Response } from "express";
import * as response from "./response.ts";

interface CustomError extends Error {
  statusCode?: number;
}

function errors(err: CustomError, req: Request, res: Response): void {
  console.error("[error]", err);

  const message = err.message || "Error interno";
  const status = err.statusCode || 500;

  response.error(req, res, message, status);
}

export default errors;
