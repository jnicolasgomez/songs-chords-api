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
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.get = get;
exports.upsert = upsert;
exports.query = query;
const db = {
    availability: [
        {
            month: "octubre",
            weekend: 2,
            days: [20, 21, 22, 23],
            shift: [
                [[], [], [], []],
                [[], [], [], []],
                [[], [], [], []],
            ],
        },
    ],
    songs: [],
};
function list(table) {
    return __awaiter(this, void 0, void 0, function* () {
        return db[table];
    });
}
function get(table, id) {
    return __awaiter(this, void 0, void 0, function* () {
        let record = yield list(table);
        // return record.filter( item => item.month === month && item.weekend === weekend)[0] || null;
        return record.filter((item) => item.id === id)[0] || null;
    });
}
function upsert(table, data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!db[table]) {
            db[table] = [];
        }
        let record = yield get(table, data.id);
        if (record) {
            Object.assign(record, data);
        }
        else {
            db[table].push(data);
        }
    });
}
/*function remove(table, id) {

}*/
function query(table, q) {
    return __awaiter(this, void 0, void 0, function* () {
        let col = yield list(table);
        let keys = Object.keys(q);
        let key = keys[0];
        return col.filter((item) => item[keys] === q[key])[0] || null;
    });
}
