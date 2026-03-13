import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { conditionalAuth } from "../../middleware/session.ts";
import { validate } from "../../middleware/validate.ts";
import { success } from "../../network/response.ts";
import { ListSchema } from "../types/types.ts";
import controller from "./index.ts";

/**
 * @swagger
 * tags:
 *   name: Lists
 *   description: Song list management
 */

const router = Router();

type ListRequest = Request & {
  query: {
    userId?: string;
    bandId?: string;
  };
}

/**
 * @swagger
 * /api/lists:
 *   post:
 *     summary: Create or update a list
 *     tags: [Lists]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, user_uid, private]
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Favourites
 *               user_uid:
 *                 type: string
 *                 example: firebase-uid-abc
 *               private:
 *                 type: boolean
 *                 example: false
 *               songs:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: List created/updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       400:
 *         description: Missing required fields
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
 */
router.post("/lists", conditionalAuth, validate(ListSchema), (req: Request, res: Response, next: NextFunction) => {
  controller
    .upsertList(req.body)
    .then((item) => {
      success(req, res, item, 201);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/lists:
 *   get:
 *     summary: List all public lists, or filter by userId
 *     tags: [Lists]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter lists by Firebase user UID
 *     responses:
 *       200:
 *         description: List of lists
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/List'
 */
router.get("/lists", conditionalAuth, (req: ListRequest, res: Response, next: NextFunction) => {
  const { userId, bandId } = req.query;
  if (bandId) {
    controller
      .listsByBand(bandId)
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  } else if (userId) {
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

/**
 * @swagger
 * /api/lists/{id}:
 *   get:
 *     summary: Get a list by ID
 *     tags: [Lists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     responses:
 *       200:
 *         description: List found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 */
router.get("/lists/:id", (req: Request, res: Response, next: NextFunction) => {
  controller
    .listById(req.params.id)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/lists/{id}/songs:
 *   post:
 *     summary: Add a song to an existing list
 *     tags: [Lists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: List ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [songId]
 *             properties:
 *               songId:
 *                 type: string
 *                 example: song-abc-123
 *     responses:
 *       200:
 *         description: Updated list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       400:
 *         description: Missing songId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: List not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/lists/:id/songs", conditionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const { songId } = req.body;
  if (!songId) {
    return next(Object.assign(new Error("songId is required"), { status: 400 }));
  }
  controller
    .addSongToList(req.params.id, songId)
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

export default router;
