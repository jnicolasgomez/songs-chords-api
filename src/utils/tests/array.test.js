import { chunkArray } from "../array.js";

describe("chunkArray", () => {
  test("splits an array into chunks of the specified size", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const size = 2;
    const expectedOutput = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    expect(chunkArray(input, size)).toEqual(expectedOutput);
  });

  test("handles arrays that are not evenly divisible by size", () => {
    const input = [1, 2, 3, 4, 5];
    const size = 2;
    const expectedOutput = [[1, 2], [3, 4], [5]];
    expect(chunkArray(input, size)).toEqual(expectedOutput);
  });

  test("returns the entire array as a single chunk when size is larger than array length", () => {
    const input = [1, 2, 3];
    const size = 5;
    const expectedOutput = [[1, 2, 3]];
    expect(chunkArray(input, size)).toEqual(expectedOutput);
  });

  test("returns an empty array when input array is empty", () => {
    const input = [];
    const size = 3;
    const expectedOutput = [];
    expect(chunkArray(input, size)).toEqual(expectedOutput);
  });

  /*test("throws an error if size is not a positive integer", () => {
    const input = [1, 2, 3, 4];
    const invalidSizes = [0, -1, "string", null, undefined, 1.5];

    invalidSizes.forEach((size) => {
      expect(() => chunkArray(input, size)).toThrow();
    });
  });*/
});
