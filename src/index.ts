import express from "express";
import type { Application } from "express";
import logger from "morgan";
import apiRoutes from "./routes/index.ts";
import bodyParser from "body-parser";
import cors from "cors";
import type { CorsOptions } from "cors";
import { initializeApp } from "firebase-admin/app";

const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const whitelist: string[] = process.env.CORS_WHITELIST
  ? process.env.CORS_WHITELIST.split(",")
  : [];

const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (whitelist.includes(origin!) || !origin) {
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
