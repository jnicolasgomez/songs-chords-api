"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const session_1 = require("../../middleware/session");
const response_1 = require("../../network/response");
const index_1 = __importDefault(require("./index"));
const router = (0, express_1.Router)();
router.post("/lists", session_1.checkJwt, (req, res, next) => {
    index_1.default
        .upsertList(req.body)
        .then((item) => {
        (0, response_1.success)(req, res, item, 201);
    })
        .catch(next);
});
router.get("/lists", (req, res, next) => {
    const userId = req.query.userId;
    if (userId) {
        index_1.default
            .listsByUser(userId)
            .then((item) => {
            (0, response_1.success)(req, res, item, 200);
        })
            .catch(next);
    }
    else {
        index_1.default
            .publicLists()
            .then((item) => {
            (0, response_1.success)(req, res, item, 200);
        })
            .catch(next);
    }
});
router.get("/lists/:id", (req, res, next) => {
    index_1.default
        .listById(req.params.id)
        .then((item) => {
        (0, response_1.success)(req, res, item, 200);
    })
        .catch(next);
});
exports.default = router;
