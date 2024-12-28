"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routes_1 = __importDefault(require("@/songs/components/routes"));
const routes_2 = __importDefault(require("@/lists/components/routes"));
const router = (0, express_1.Router)();
router.use(routes_1.default);
router.use(routes_2.default);
exports.default = router;
