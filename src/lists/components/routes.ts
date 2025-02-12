import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { checkJwt } from "../../middleware/session.ts";
import { success } from "../../network/response.ts";
import controller from "./index.ts";

const router = Router();

type ListRequest = Request & {
  query: {
    userId?: string;
  };
}

router.post("/lists", checkJwt, (req: Request, res: Response, next: NextFunction) => {
  controller
    .upsertList(req.body)
    .then((item) => {
      success(req, res, item, 201);
    })
    .catch(next);
});

router.get("/lists", (req: ListRequest, res: Response, next: NextFunction) => {
  const { userId } = req.query;
  if (userId) {
    controller
      .listsByUser(userId)
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  } else {
    controller
      .publicLists()
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  }
});

router.get("/lists/:id", (req: Request, res: Response, next: NextFunction) => {
  controller
    .listById(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

export default router;
