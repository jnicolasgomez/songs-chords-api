import { getAuth } from "firebase-admin/auth";
import type {Request, Response, NextFunction } from "express";

const handleHttp = (res: Response, message: string, error: unknown, statusCode: number): void => {
  res.status(statusCode).json({ message, error });
};

const validateJwt = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const jwt = req.headers.authorization?.split(" ").pop();
    if (jwt) {
      getAuth()
        .verifyIdToken(jwt)
        .then((decodedToken) => { (req as any).uid = decodedToken.uid; next(); })
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
};

// Validates JWT only when userId query param or :id route param is present.
// Requests without those params pass through unauthenticated.
const conditionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = (req.query.userId as string) || req.params.id;
  if (userId) {
    validateJwt(req, res, next);
  } else {
    next();
  }
};

// Always validates JWT, regardless of params.
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  validateJwt(req, res, next);
};

export { conditionalAuth, requireAuth };
