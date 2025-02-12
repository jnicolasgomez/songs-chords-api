import type { Request, Response } from "express";

const success = function (req: Request, res: Response, message: any, status?: number): void {
  const statusCode = status || 200;
  const statusMessage = message || "";
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(statusCode).send({
    error: false,
    status,
    body: statusMessage,
  });
};

const error = function (req: Request, res: Response, message?: string, status?: number): void {
  const statusCode = status || 500;
  const statusMessage = message || "Internal Server Error";
  res.status(statusCode).send({
    error: false,
    status,
    body: statusMessage,
  });
};

export { success, error };
