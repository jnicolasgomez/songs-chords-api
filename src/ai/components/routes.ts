import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/session.ts";
import { validate } from "../../middleware/validate.ts";
import { success } from "../../network/response.ts";
import { AiChatRequestSchema } from "../types/types.ts";
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
  validate(AiChatRequestSchema),
  (req: Request, res: Response, next: NextFunction) => {
    controller
      .chat(req.body)
      .then((result) => success(req, res, result, 200))
      .catch(next);
  }
);

export default router;
