import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/session.ts";
import { aiChatLimiter } from "../../middleware/rateLimit.ts";
import { validate } from "../../middleware/validate.ts";
import { success } from "../../network/response.ts";
import {
  AiChatRequestSchema,
  AiSongDetailsRequestSchema,
} from "../types/types.ts";
import controller from "./index.ts";

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI music assistant
 */

const router = Router();

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Send a message to the AI music assistant
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               songContext:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   artist:
 *                     type: string
 *                   chordsText:
 *                     type: string
 *                   tone:
 *                     type: string
 *                   bpm:
 *                     type: number
 *     responses:
 *       200:
 *         description: AI reply
 *       400:
 *         description: Validation error
 *       403:
 *         description: Invalid or missing JWT
 */
router.post(
  "/ai/chat",
  requireAuth,
  aiChatLimiter,
  validate(AiChatRequestSchema),
  (req: Request, res: Response, next: NextFunction) => {
    controller
      .chat(req.body)
      .then((result) => success(req, res, result, 200))
      .catch(next);
  }
);

/**
 * @swagger
 * /api/ai/song-details:
 *   post:
 *     summary: Use AI to look up tone, bpm and duration for a song
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, artist]
 *             properties:
 *               title:
 *                 type: string
 *               artist:
 *                 type: string
 *     responses:
 *       200:
 *         description: Song details (found=false if the song was not recognised)
 *       400:
 *         description: Validation error
 *       403:
 *         description: Invalid or missing JWT
 */
router.post(
  "/ai/song-details",
  requireAuth,
  aiChatLimiter,
  validate(AiSongDetailsRequestSchema),
  (req: Request, res: Response, next: NextFunction) => {
    controller
      .getSongDetails(req.body)
      .then((result) => success(req, res, result, 200))
      .catch(next);
  }
);

export default router;
