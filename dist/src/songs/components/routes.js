// import { Router } from "express";
// import { checkJwt } from "../../middleware/session";
// import { success } from "../../network/response";
// import controller from "./index";
// const router = Router();
// router.post("/songs", (req, res, next) => {
//   controller
//     .upsertSong(req.body)
//     .then((item) => {
//       success(req, res, item, 201);
//     })
//     .catch(next);
// });
// router.get("/songs", checkJwt, (req, res, next) => {
//   const { ids, userId } = req.query;
//   if (ids) {
//     const idArray = ids.split(",").map((id) => id.trim());
//     controller
//       .getSongsByIds(idArray)
//       .then((item) => {
//         success(req, res, item, 200);
//       })
//       .catch(next);
//   } else if (userId) {
//     controller
//       .listSongs(userId)
//       .then((item) => {
//         success(req, res, item, 200);
//       })
//       .catch(next);
//   } else {
//     controller
//       .listSongs()
//       .then((item) => {
//         success(req, res, item, 200);
//       })
//       .catch(next);
//   }
// });
// router.get("/songs/:id", (req, res, next) => {
//   controller
//     .getSongById(req.params.id)
//     .then((item) => {
//       success(req, res, item, 200);
//     })
//     .catch(next);
// });
// router.get("/songs/list/:id", (req, res, next) => {
//   controller
//     .getSongByList(req.params.id)
//     .then((item) => {
//       success(req, res, item, 200);
//     })
//     .catch(next);
// });
// export default router;
import { Router } from "express";
import { checkJwt } from "../../middleware/session";
import { success } from "../../network/response";
import controller from "./index";
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
    // Handle ids query parameter
    if (ids && typeof ids === 'string') {
        const idArray = ids.split(",").map((id) => id.trim());
        controller
            .getSongsByIds(idArray)
            .then((item) => {
            success(req, res, item, 200);
        })
            .catch(next);
    }
    else if (userId && typeof userId === 'string') {
        // Handle userId query parameter
        controller
            .listSongs(userId)
            .then((item) => {
            success(req, res, item, 200);
        })
            .catch(next);
    }
    else {
        // Fallback: if no ids or userId, list all songs
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
