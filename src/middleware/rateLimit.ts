import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

export const aiChatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => (req as any).uid ?? ipKeyGenerator(req),
  handler: (_req, res) => {
    res.status(429).json({
      message: "RATE_LIMIT_EXCEEDED",
      error: "Has alcanzado el límite de mensajes. Intenta de nuevo en 1 hora.",
    });
  },
});
