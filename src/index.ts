import express from "express";
import type { Application } from "express";
import logger from "morgan";
import apiRoutes from "./routes/index.ts";
import bodyParser from "body-parser";
import cors from "cors";
import type { CorsOptions } from "cors";
import { initializeApp } from "firebase-admin/app";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.ts";

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

initializeApp();
const app: Application = express();

app.use(bodyParser.json());
app.use(logger("dev"));
app.use(cors(corsOptions));

app.use("/api", apiRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
