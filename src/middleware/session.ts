import { getAuth } from "firebase-admin/auth";
import type {Request, Response, NextFunction } from "express";

const handleHttp = (res: Response, message: string, error: unknown, statusCode: number): void => {
  res.status(statusCode).json({ message, error });
};

const checkJwt = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.query.userId as string || req.params.id;
  if (userId) {
    try {
      const jwtByUser = req.headers.authorization || null;
      const jwt = jwtByUser?.split(" ").pop();
      if (jwt) {
        getAuth()
          .verifyIdToken(jwt)
          .then(function () {
            return next();
          })
          .catch((e) => {
            console.error(e);
            handleHttp(res, "INVALID_SESSION", e, 403);
          });
      } else {
        handleHttp(res, "INVALID_SESSION", "No jwt", 403);
      }
    } catch (e) {
      console.error(e);
      handleHttp(res, "INVALID_SESSION", e, 400);
    }
  } else {
    return next();
  }
};

export { checkJwt };
