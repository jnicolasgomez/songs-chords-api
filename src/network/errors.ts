import { Request, Response, NextFunction } from 'express';
import * as response from './response';
import { IErrorStatusCode } from "@/interfaces/error"

function errors(err: IErrorStatusCode, req: Request, res: Response, next: NextFunction): void {
  console.error("[error]", err);

  const message = err.message || "Error interno";
  const status = err.statusCode || 500;

  response.error(req, res, message, status);
}

export default errors;
