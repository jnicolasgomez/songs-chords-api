import { Router } from "express";
import type { Request, Response } from "express";
import { ping as mongoPing } from "../store/mongoStore.ts";
import { ping as firestorePing } from "../store/firestore.ts";
import logger from "../utils/logger.ts";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns the health status of the API and its dependencies.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All systems operational
 *       503:
 *         description: One or more dependencies are down
 */
router.get("/health", async (_req: Request, res: Response) => {
  const start = Date.now();

  const [mongo, firestore] = await Promise.allSettled([
    mongoPing(),
    firestorePing(),
  ]);

  const checks = {
    mongo:     mongo.status === "fulfilled" && mongo.value ? "ok" : "error",
    firestore: firestore.status === "fulfilled" && firestore.value ? "ok" : "error",
  };

  const allHealthy = Object.values(checks).every((v) => v === "ok");
  const status = allHealthy ? "ok" : "degraded";
  const httpStatus = allHealthy ? 200 : 503;

  const body = {
    status,
    uptime: Math.floor(process.uptime()),
    responseTime: Date.now() - start,
    checks,
    env: process.env.NODE_ENV || "development",
  };

  if (!allHealthy) {
    logger.warn("Health check degraded", { checks });
  }

  res.status(httpStatus).json(body);
});

export default router;
