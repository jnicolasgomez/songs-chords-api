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
router.post("/songs", (req, res, next) => {
    index_1.default
        .upsertSong(req.body)
        .then((item) => {
        (0, response_1.success)(req, res, item, 201);
    })
        .catch(next);
});
router.get("/songs", session_1.checkJwt, (req, res, next) => {
    const { ids, userId } = req.query;
    if (ids) {
        const idArray = ids.split(",").map((id) => id.trim());
        index_1.default
            .getSongsByIds(idArray)
            .then((item) => {
            (0, response_1.success)(req, res, item, 200);
        })
            .catch(next);
    }
    else if (userId) {
        index_1.default
            .listSongs(userId)
            .then((item) => {
            (0, response_1.success)(req, res, item, 200);
        })
            .catch(next);
    }
    else {
        index_1.default
            .listSongs()
            .then((item) => {
            (0, response_1.success)(req, res, item, 200);
        })
            .catch(next);
    }
});
router.get("/songs/:id", (req, res, next) => {
    index_1.default
        .getSongById(req.params.id)
        .then((item) => {
        (0, response_1.success)(req, res, item, 200);
    })
        .catch(next);
});
router.get("/songs/list/:id", (req, res, next) => {
    index_1.default
        .getSongByList(req.params.id)
        .then((item) => {
        (0, response_1.success)(req, res, item, 200);
    })
        .catch(next);
});
exports.default = router;
