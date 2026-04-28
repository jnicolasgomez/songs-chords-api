import controllerFactory from "../controller.ts";
import { ListSchema } from "../../types/types.ts";

function makeMockStore(seed = []) {
  const data = new Map(seed.map((l) => [l.id, l]));
  return {
    async list() { return [...data.values()]; },
    async get(_table, id) { return data.get(id) ?? null; },
    async upsert(_table, body) {
      data.set(body.id, body);
      return { id: body.id };
    },
    async query(_table, filter) {
      if (filter && filter.id) {
        const hit = data.get(filter.id);
        return hit ? [hit] : [];
      }
      return [...data.values()];
    },
    async byUserId() { return []; },
    async listPublic() { return []; },
    async byIdsArray() { return []; },
    async sharedWithUser() { return []; },
    _data: data,
  };
}

const baseList = {
  id: "list-1",
  title: "Demo",
  user_uid: "u1",
  private: false,
};

describe("ListSchema", () => {
  test("accepts a list with mixed items (song, set, pause)", () => {
    const result = ListSchema.safeParse({
      ...baseList,
      items: [
        { type: "set", label: "Opening" },
        { type: "song", songId: "s1" },
        { type: "pause", minutes: 15, label: "Break" },
        { type: "song", songId: "s2" },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("rejects an item with an unknown type", () => {
    const result = ListSchema.safeParse({
      ...baseList,
      items: [{ type: "intermezzo", label: "x" }],
    });
    expect(result.success).toBe(false);
  });

  test("rejects a pause without minutes", () => {
    const result = ListSchema.safeParse({
      ...baseList,
      items: [{ type: "pause", label: "Break" }],
    });
    expect(result.success).toBe(false);
  });

  test("accepts a legacy songs-only payload (no items)", () => {
    const result = ListSchema.safeParse({
      ...baseList,
      songs: ["s1", "s2"],
    });
    expect(result.success).toBe(true);
  });
});

describe("upsertList", () => {
  test("derives songs from items when items is provided", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertList({
      ...baseList,
      items: [
        { type: "set", label: "Opening" },
        { type: "song", songId: "s1" },
        { type: "pause", minutes: 10 },
        { type: "song", songId: "s2" },
      ],
    });

    const stored = store._data.get("list-1");
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toHaveLength(4);
  });

  test("overwrites incoming songs with values derived from items", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertList({
      ...baseList,
      songs: ["stale-id"],
      items: [
        { type: "song", songId: "s1" },
        { type: "song", songId: "s2" },
      ],
    });

    expect(store._data.get("list-1").songs).toEqual(["s1", "s2"]);
  });

  test("preserves songs as-is for legacy payloads without items", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertList({
      ...baseList,
      songs: ["s1", "s2"],
    });

    const stored = store._data.get("list-1");
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toBeUndefined();
  });
});

describe("addSongToList", () => {
  test("appends to songs when list has no items field (legacy)", async () => {
    const store = makeMockStore([{ ...baseList, songs: ["s1"] }]);
    const controller = controllerFactory(store);

    await controller.addSongToList("list-1", "s2");

    const stored = store._data.get("list-1");
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toBeUndefined();
  });

  test("appends to both songs and items when list already uses items", async () => {
    const store = makeMockStore([
      {
        ...baseList,
        songs: ["s1"],
        items: [
          { type: "set", label: "Opening" },
          { type: "song", songId: "s1" },
        ],
      },
    ]);
    const controller = controllerFactory(store);

    await controller.addSongToList("list-1", "s2");

    const stored = store._data.get("list-1");
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toEqual([
      { type: "set", label: "Opening" },
      { type: "song", songId: "s1" },
      { type: "song", songId: "s2" },
    ]);
  });

  test("is idempotent for an already-present song", async () => {
    const store = makeMockStore([
      {
        ...baseList,
        songs: ["s1"],
        items: [{ type: "song", songId: "s1" }],
      },
    ]);
    const controller = controllerFactory(store);

    await controller.addSongToList("list-1", "s1");

    const stored = store._data.get("list-1");
    expect(stored.songs).toEqual(["s1"]);
    expect(stored.items).toEqual([{ type: "song", songId: "s1" }]);
  });

  test("throws when the list does not exist", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await expect(controller.addSongToList("missing", "s1")).rejects.toThrow(
      /missing/
    );
  });
});
