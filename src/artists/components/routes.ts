import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { success } from "../../network/response.ts";
import controller from "./index.ts";

/**
 * @swagger
 * tags:
 *   name: Artists
 *   description: Artist management
 */

const router = Router();

/**
 * @swagger
 * /api/artists:
 *   get:
 *     summary: List all artists
 *     tags: [Artists]
 *     responses:
 *       200:
 *         description: List of artists
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Artist'
 */
router.get("/artists", (req: Request, res: Response, next: NextFunction) => {
  controller
    .listArtists()
    .then((items) => {
      success(req, res, items, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/artists:
 *   post:
 *     summary: Create or update an artist
 *     tags: [Artists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: The Beatles
 *     responses:
 *       201:
 *         description: Artist created/updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Artist'
 */
router.post("/artists", (req: Request, res: Response, next: NextFunction) => {
  controller
    .upsertArtist(req.body.name)
    .then((item) => {
      success(req, res, item, 201);
    })
    .catch(next);
});

export default router;
