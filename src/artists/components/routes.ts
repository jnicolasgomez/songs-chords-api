import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { success } from "../../network/response.ts";
import controller from "./index.ts";

const router = Router();

router.get("/artists", (req: Request, res: Response, next: NextFunction) => {
  controller
    .listArtists()
    .then((items) => {
      success(req, res, items, 200);
    })
    .catch(next);
});

router.post("/artists", (req: Request, res: Response, next: NextFunction) => {
  controller
    .upsertArtist(req.body.name)
    .then((item) => {
      success(req, res, item, 201);
    })
    .catch(next);
});

export default router;
