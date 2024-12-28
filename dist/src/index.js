"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const index_1 = __importDefault(require("./routes/index"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const app_1 = require("firebase-admin/app");
const port = parseInt((_a = process.env.PORT) !== null && _a !== void 0 ? _a : "3001", 10);
const corsOptions = {
    origin: "*",
};
(0, app_1.initializeApp)();
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use((0, morgan_1.default)("dev"));
app.use((0, cors_1.default)(corsOptions));
app.use("/api", index_1.default);
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
