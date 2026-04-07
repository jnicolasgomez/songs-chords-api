import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { conditionalAuth, requireAuth } from "../../middleware/session.ts";
import { writeLimiter } from "../../middleware/rateLimit.ts";
import { validate } from "../../middleware/validate.ts";
import { success } from "../../network/response.ts";
import { SongSchema } from "../types/types.ts";
import controller from "./index.ts";
import usersController from "../../users/components/index.ts";

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
    bandId?: string;
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
router.post("/songs", writeLimiter, validate(SongSchema), (req: Request, res: Response, next: NextFunction) => {
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
router.get("/songs", conditionalAuth, (req: SongRequest, res: Response, next: NextFunction) => {
  const { ids, userId, bandId } = req.query;
  if ("ids" in req.query) {
    if (!ids?.trim()) {
      return success(req, res, [], 200);
    }
    const idArray = ids.split(",").map((id) => id.trim()).filter(Boolean);
    controller
      .getSongsByIds(idArray)
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  } else if (bandId) {
    controller
      .songsByBand(bandId)
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
router.get("/songs/user/:id", conditionalAuth, (req: Request, res: Response, next: NextFunction) => {
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
router.put("/songs/:id", conditionalAuth, writeLimiter, (req: Request, res: Response, next: NextFunction) => {
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

/**
 * @swagger
 * /api/songs/{id}/collaborators:
 *   post:
 *     summary: Share a song with a collaborator by email
 *     description: Resolves the email to a Firebase UID and adds it to the song's shared_with array. The collaborator will be able to view and edit the song.
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
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: collaborator@example.com
 *     responses:
 *       200:
 *         description: Collaborator added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *       400:
 *         description: Missing email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Song or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/songs/:id/collaborators", requireAuth, writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    return next(Object.assign(new Error("email is required"), { status: 400 }));
  }
  try {
    const { uid } = await usersController.lookupByEmail(email);
    const result = await controller.shareSong(req.params.id, uid);
    success(req, res, result, 200);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/songs/{id}/collaborators/{uid}:
 *   delete:
 *     summary: Remove a collaborator from a song
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
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase UID of the collaborator to remove
 *     responses:
 *       200:
 *         description: Collaborator removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *       403:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Song not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/songs/:id/collaborators/:uid", requireAuth, (req: Request, res: Response, next: NextFunction) => {
  controller
    .unshareSong(req.params.id, req.params.uid)
    .then((item) => success(req, res, item, 200))
    .catch(next);
});

export default router;
