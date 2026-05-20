import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/session.ts";
import { aiChatLimiter } from "../../middleware/rateLimit.ts";
import { validate } from "../../middleware/validate.ts";
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
 *         description: Streamed AI reply (text/plain stream of UTF-8 chunks)
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = controller.chat(req.body);

      res.status(200);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      for await (const chunk of result.textStream) {
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
