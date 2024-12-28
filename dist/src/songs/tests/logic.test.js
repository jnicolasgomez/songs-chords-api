"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logic_1 = require("../components/logic");
test("adds 1 + 2 to equal 3", () => {
    expect((0, logic_1.sum)(1, 2)).toBe(3);
});
