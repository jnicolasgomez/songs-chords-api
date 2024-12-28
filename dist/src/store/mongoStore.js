"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = connect;
exports.disconnect = disconnect;
exports.list = list;
exports.get = get;
exports.upsert = upsert;
exports.remove = remove;
exports.query = query;
const mongodb_1 = require("mongodb");
const _config_1 = __importDefault(require("@config"));
const uri = _config_1.default.mongoDb.uri;
const client = new mongodb_1.MongoClient(uri);
let database = null;
connect();
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.connect();
            database = client.db();
            console.log("Connected to MongoDB Atlas");
        }
        catch (error) {
            console.error("Error connecting to MongoDB Atlas:", error);
        }
    });
}
function disconnect() {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.close();
        console.log("Disconnected from MongoDB Atlas");
    });
}
function list(table) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!database) {
            throw new Error("Database connection is not established.");
        }
        const collection = database.collection(table);
        const result = yield collection.find({}).toArray();
        return result;
    });
}
function get(table, id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!database) {
            throw new Error("Database connection is not established.");
        }
        const collection = database.collection(table);
        const result = yield collection.findOne({ id: id });
        return result;
    });
}
function upsert(table, data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!database) {
            throw new Error("Database connection is not established.");
        }
        const collection = database.collection(table);
        const filter = { id: data.id };
        const options = { upsert: true };
        const result = yield collection.replaceOne(filter, data, options);
        return result.modifiedCount || result.upsertedCount;
    });
}
function remove(table, id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!database) {
            throw new Error("Database connection is not established.");
        }
        const collection = database.collection(table);
        const result = yield collection.deleteOne({ _id: id });
        return result.deletedCount;
    });
}
function query(table, q) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!database) {
            throw new Error("Database connection is not established.");
        }
        const collection = database.collection(table);
        const result = yield collection.find(q).toArray();
        return result;
    });
}
