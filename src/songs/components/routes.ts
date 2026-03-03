import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { checkJwt } from "../../middleware/session.ts";
import { validate } from "../../middleware/validate.ts";
import { success } from "../../network/response.ts";
import { SongSchema } from "../types/types.ts";
import controller from "./index.ts";

/**
 * @swagger
 * tags:
 *   name: Songs
 *   description: Song management
 */

const router = Router();

type SongRequest = Request & {
  query: {
    ids?: string;
    userId?: string;
  };
}

/**
 * @swagger
 * /api/songs:
 *   post:
 *     summary: Create or update a song
 *     tags: [Songs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Song'
 *     responses:
 *       201:
 *         description: Song created/updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Song'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/songs", validate(SongSchema), (req: Request, res: Response, next: NextFunction) => {
  controller
    .upsertSong(req.body)
    .then((item) => {
      success(req, res, item, 201);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/songs:
 *   get:
 *     summary: List songs (all, by userId, or by ids)
 *     tags: [Songs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter songs by user ID (requires JWT)
 *       - in: query
 *         name: ids
 *         schema:
 *           type: string
 *         description: Comma-separated song IDs to fetch
 *     responses:
 *       200:
 *         description: List of songs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Song'
 *       403:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/songs/user/{id}:
 *   get:
 *     summary: Get songs by user ID
 *     tags: [Songs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase user UID
 *     responses:
 *       200:
 *         description: Songs for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Song'
 *       403:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/songs/user/:id", checkJwt, (req: Request, res: Response, next: NextFunction) => {
  controller
    .songsByUser(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/songs/artist/{artist}:
 *   get:
 *     summary: Get songs by artist name
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: artist
 *         required: true
 *         schema:
 *           type: string
 *         description: Artist name
 *     responses:
 *       200:
 *         description: Songs by artist
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Song'
 */
router.get("/songs/artist/:artist", (req: Request, res: Response, next: NextFunction) => {
  controller
    .songsByArtist(req.params.artist)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/songs/{id}:
 *   put:
 *     summary: Update a song by ID
 *     tags: [Songs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Song ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Song'
 *     responses:
 *       200:
 *         description: Song updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Song'
 *       403:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/songs/:id", checkJwt, (req: Request, res: Response, next: NextFunction) => {
  controller
    .patchSong(req.params.id, req.body)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/songs/{id}:
 *   get:
 *     summary: Get a song by ID
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Song ID
 *     responses:
 *       200:
 *         description: Song found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Song'
 */
router.get("/songs/:id", (req: Request, res: Response, next: NextFunction) => {
  controller
    .getSongById(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/songs/list/{id}:
 *   get:
 *     summary: Get songs by list ID
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     responses:
 *       200:
 *         description: Songs in the list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Song'
 */
router.get("/songs/list/:id", (req: Request, res: Response, next: NextFunction) => {
  controller
    .getSongByList(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

export default router;
