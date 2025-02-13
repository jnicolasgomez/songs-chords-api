import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { checkJwt } from "../../middleware/session.ts";
import { success } from "../../network/response.ts";
import controller from "./index.ts";


const router = Router();

type SongRequest = Request & {
  query: {
    ids?: string;
    userId?: string;
  };
}

router.post("/songs", (req: Request, res: Response, next: NextFunction) => {
  controller
    .upsertSong(req.body)
    .then((item) => {
      success(req, res, item, 201);
    })
    .catch(next);
});

router.get("/songs", checkJwt, (req: SongRequest, res: Response, next: NextFunction) => {
  const { ids, userId } = req.query;
  if (ids) {
    const idArray = ids.split(",").map((id) => id.trim());
    controller
      .getSongsByIds(idArray)
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  } else if (userId) {
    controller
      .listSongs(userId)
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  } else {
    controller
      .listSongs()
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  }
});

router.get("/songs/user/:id", checkJwt, (req: Request, res: Response, next: NextFunction) => {
  controller
    .songsByUser(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

router.get("/songs/:id", (req: Request, res: Response, next: NextFunction) => {
  controller
    .getSongById(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

router.get("/songs/list/:id", (req: Request, res: Response, next: NextFunction) => {
  controller
    .getSongByList(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

export default router;
