import * as Sentry from "@sentry/node";

// Sentry must be initialized before any other imports
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: process.env.NODE_ENV === "production",
});

import express from "express";
import type { Application } from "express";
import logger from "morgan";
import apiRoutes from "./routes/index.ts";
import bodyParser from "body-parser";
import cors from "cors";
import type { CorsOptions } from "cors";
import helmet from "helmet";
import { initializeApp } from "firebase-admin/app";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.ts";
import { globalLimiter } from "./middleware/rateLimit.ts";

const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const whitelist: string[] = process.env.CORS_WHITELIST
  ? process.env.CORS_WHITELIST.split(",")
  : [];

/**
 * Returns true if `origin` matches any entry in `patterns`.
 * Entries containing `*` are treated as globs where `*` matches any
 * sequence of characters that does not include `.` (i.e. a single
 * subdomain segment), so `https://bandmate*.vercel.app` covers all
 * Vercel branch-preview URLs without allowing unrelated domains.
 */
function originAllowed(origin: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (!pattern.includes("*")) return origin === pattern;
    const regex = new RegExp(
      "^" +
      pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^.]*") +
      "$"
    );
    return regex.test(origin);
  });
}

const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || originAllowed(origin, whitelist)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});
const app: Application = express();
const isProduction = process.env.NODE_ENV === "production";

app.use(helmet());
app.use(bodyParser.json());
app.use(logger("dev"));
app.use(cors(corsOptions));

app.use("/api", globalLimiter, apiRoutes);

// Swagger UI: only available in development
if (!isProduction) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Sentry error handler must be after routes and before other error handlers
Sentry.setupExpressErrorHandler(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
