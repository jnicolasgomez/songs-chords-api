import { StoreCache } from "../cache";

describe("StoreCache", () => {
  let cache;

  beforeEach(() => {
    cache = new StoreCache("test");
  });

  test("get returns undefined for missing keys", () => {
    expect(cache.get("nope")).toBeUndefined();
  });

  test("set and get round-trip", () => {
    cache.set("songs:list", [{ id: "1" }]);
    expect(cache.get("songs:list")).toEqual([{ id: "1" }]);
  });

  test("expired entries return undefined and are deleted", () => {
    const short = new StoreCache("test", 1); // 1ms TTL
    short.set("songs:list", [{ id: "1" }]);

    // wait for expiry
    const start = Date.now();
    while (Date.now() - start < 5) {} // busy-wait 5ms

    expect(short.get("songs:list")).toBeUndefined();
    // a second get should also miss (entry was deleted, not just skipped)
    expect(short.get("songs:list")).toBeUndefined();
  });

  test("get returns a defensive copy for arrays", () => {
    cache.set("songs:list", [{ id: "1" }, { id: "2" }]);

    const first = cache.get("songs:list");
    first.reverse();
    first.push({ id: "3" });

    const second = cache.get("songs:list");
    expect(second).toEqual([{ id: "1" }, { id: "2" }]);
  });

  test("invalidate removes only keys matching the prefix", () => {
    cache.set("songs:list", ["a"]);
    cache.set("songs:listPublic", ["b"]);
    cache.set("artists:list", ["c"]);

    cache.invalidate("songs");

    expect(cache.get("songs:list")).toBeUndefined();
    expect(cache.get("songs:listPublic")).toBeUndefined();
    expect(cache.get("artists:list")).toEqual(["c"]);
  });

  test("invalidate does not match partial prefix (list vs lists)", () => {
    cache.set("lists:query:{}", ["a"]);
    cache.set("list:songs", ["b"]);

    cache.invalidate("list");

    expect(cache.get("list:songs")).toBeUndefined();
    expect(cache.get("lists:query:{}")).toEqual(["a"]);
  });

  test("clear removes all entries", () => {
    cache.set("songs:list", ["a"]);
    cache.set("artists:list", ["b"]);

    cache.clear();

    expect(cache.get("songs:list")).toBeUndefined();
    expect(cache.get("artists:list")).toBeUndefined();
  });
});
