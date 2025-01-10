import express from "express";
import logger from "morgan";
import apiRoutes from "./routes/index";
import bodyParser from "body-parser";
import cors from "cors";
import { initializeApp } from "firebase-admin/app";
const port = parseInt(process.env.PORT ?? "3001", 10);
const corsOptions = {
    origin: "*",
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
