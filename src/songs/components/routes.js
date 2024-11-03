import { Router } from "express";
import { checkJwt } from "../../middleware/session.js";
import { success } from "../../network/response.js";
import controller from "./index.js";

const router = Router();

router.post("/songs", (req, res, next) => {
  controller
    .upsertSong(req.body)
    .then((item) => {
      success(req, res, item, 201);
    })
    .catch(next);
});

router.get("/songs", checkJwt, (req, res, next) => {
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

router.get("/songs/:id", (req, res, next) => {
  controller
    .getSongById(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

router.get("/songs/list/:id", (req, res, next) => {
  controller
    .getSongByList(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

export default router;
