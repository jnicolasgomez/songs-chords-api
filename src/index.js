import express from "express";
import logger from "morgan";
import apiRoutes from "./routes/index.js";
import bodyParser from "body-parser";
import cors from "cors";
import { initializeApp } from "firebase-admin/app";

const port = process.env.PORT ?? 3001;
const whitelist = process.env.CORS_WHITELIST
  ? process.env.CORS_WHITELIST.split(",")
  : [];

console.log(whitelist);

const corsOptions = {
  origin: function (origin, callback) {
    console.log(origin);
    if (whitelist.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

initializeApp();
const app = express();

app.use(bodyParser.json());
app.use(logger("dev"));
app.use(cors(corsOptions));

app.use("/api", apiRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
