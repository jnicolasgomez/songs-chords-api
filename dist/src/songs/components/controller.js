"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const store = __importStar(require("@/store/dummy"));
const SONGS_TABLE = "songs";
const LISTS_TABLE = "lists";
function default_1(injectedStore) {
    if (!injectedStore) {
        injectedStore = store;
    }
    function listSongs(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (userId) {
                return (yield songsByUser(userId)).concat(yield publicSongs());
            }
            else {
                return publicSongs();
            }
        });
    }
    function songsByUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            let songs = yield injectedStore.query(SONGS_TABLE, {
                $or: [{ user_uid: userId }],
            });
            return songs;
        });
    }
    function publicSongs() {
        return __awaiter(this, void 0, void 0, function* () {
            let songs = yield injectedStore.query(SONGS_TABLE, {
                $or: [
                    { private: false },
                    { private: { $exists: false } },
                    { private: null },
                ],
            });
            return songs;
        });
    }
    function getSongById(id) {
        return injectedStore.get(SONGS_TABLE, id);
    }
    function getSongsByIds(idArray) {
        return __awaiter(this, void 0, void 0, function* () {
            const songsList = yield injectedStore.query(SONGS_TABLE, {
                id: { $in: idArray },
            });
            // Create a map to store the indices of songsIds
            const indexMap = {};
            idArray.forEach((id, index) => {
                indexMap[id] = index;
            });
            // Sort songsList based on the order of songsIds
            songsList.sort((a, b) => {
                return indexMap[a.id] - indexMap[b.id];
            });
            return songsList;
        });
    }
    function upsertSong(body) {
        return __awaiter(this, void 0, void 0, function* () {
            return injectedStore.upsert(SONGS_TABLE, body);
        });
    }
    function getSongByList(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentList = yield injectedStore.get(LISTS_TABLE, id);
            const songsIds = currentList.songs;
            const songsList = yield injectedStore.query(SONGS_TABLE, {
                id: { $in: songsIds },
            });
            // Create a map to store the indices of songsIds
            const indexMap = {};
            songsIds.forEach((id, index) => {
                indexMap[id] = index;
            });
            // Sort songsList based on the order of songsIds
            songsList.sort((a, b) => {
                return indexMap[a.id] - indexMap[b.id];
            });
            return songsList;
        });
    }
    return { upsertSong, listSongs, getSongById, getSongByList, getSongsByIds };
}
