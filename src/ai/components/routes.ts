import { Router } from "express";
import type { Request, Response } from "express";
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
 *               provider:
 *                 type: string
 *                 enum: [anthropic, gemini]
 *                 default: gemini
 *                 description: AI provider to use for the chat response
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
 *               setlistContext:
 *                 type: object
 *                 description: Setlist context for the AI assistant
 *                 properties:
 *                   title:
 *                     type: string
 *                   songs:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         artist:
 *                           type: string
 *                         tone:
 *                           type: string
 *                         bpm:
 *                           type: number
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
  async (req: Request, res: Response) => {
    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    try {
      const result = controller.chat(req.body, abortController.signal);

      let headersSent = false;

      for await (const part of result.fullStream) {
        if (abortController.signal.aborted) break;

        if (part.type === "error") {
          // Provider error delivered as a stream event (not thrown)
          if (!res.headersSent) {
            const err: any = part.error;
            const statusCode =
              err?.statusCode ?? err?.status ?? err?.data?.statusCode ?? 502;
            const responseBody =
              err?.responseBody ?? err?.data?.responseBody;

            let errorMessage = err?.message ?? "AI provider error";
            let errorType = "ai_provider_error";

            if (responseBody) {
              try {
                const parsed =
                  typeof responseBody === "string"
                    ? JSON.parse(responseBody)
                    : responseBody;
                errorMessage = parsed?.error?.message ?? errorMessage;
                errorType = parsed?.error?.type ?? errorType;
              } catch {
                // responseBody wasn't valid JSON, keep defaults
              }
            }

            res.status(statusCode).json({
              error: { message: errorMessage, type: errorType, statusCode },
            });
          } else {
            res.end();
          }
          return;
        }

        if (part.type === "text-delta") {
          if (!headersSent) {
            res.status(200);
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders?.();
            headersSent = true;
          }
          res.write(part.textDelta);
        }
      }

      // If stream ended without producing any chunks, return an error
      if (!headersSent && !res.headersSent) {
        res.status(502).json({
          error: {
            message: "No response from AI provider",
            type: "ai_provider_error",
            statusCode: 502,
          },
        });
        return;
      }

      res.end();
    } catch (err: any) {
      if (res.headersSent) {
        res.end();
        return;
      }

      // Fallback: error was thrown rather than delivered as a stream event
      const statusCode =
        err?.statusCode ?? err?.status ?? err?.data?.statusCode ?? 500;
      const responseBody = err?.responseBody ?? err?.data?.responseBody;

      let errorMessage = err?.message ?? "AI provider error";
      let errorType = "ai_provider_error";

      if (responseBody) {
        try {
          const parsed =
            typeof responseBody === "string"
              ? JSON.parse(responseBody)
              : responseBody;
          errorMessage = parsed?.error?.message ?? errorMessage;
          errorType = parsed?.error?.type ?? errorType;
        } catch {
          // responseBody wasn't valid JSON, keep defaults
        }
      }

      res.status(statusCode).json({
        error: { message: errorMessage, type: errorType, statusCode },
      });
    }
  }
);

export default router;
