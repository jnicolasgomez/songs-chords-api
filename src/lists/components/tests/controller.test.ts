import controllerFactory from "../controller.ts";
import { ListSchema } from "../../types/types.ts";
import type { List } from "../../types/types.ts";
import { makeMockStore } from "./mockStore.ts";

// Prevent mongoStore from calling connect() at import time, which logs async
// errors after tests finish ("Cannot log after tests are done").
jest.mock("../../../store/mongoStore.ts", () => ({}));

const OWNER = "u1";
const OTHER = "u2";

const baseList: List = {
  id: "list-1",
  title: "Demo",
  user_uid: OWNER,
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
    const store = makeMockStore([{ ...baseList }]);
    const controller = controllerFactory(store);

    await controller.upsertList(
      {
        ...baseList,
        items: [
          { type: "set", label: "Opening" },
          { type: "song", songId: "s1" },
          { type: "pause", minutes: 10 },
          { type: "song", songId: "s2" },
        ],
      },
      OWNER,
    );

    const stored = store._data.get("list-1")!;
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toHaveLength(4);
  });

  test("overwrites incoming songs with values derived from items", async () => {
    const store = makeMockStore([{ ...baseList }]);
    const controller = controllerFactory(store);

    await controller.upsertList(
      {
        ...baseList,
        songs: ["stale-id"],
        items: [
          { type: "song", songId: "s1" },
          { type: "song", songId: "s2" },
        ],
      },
      OWNER,
    );

    expect(store._data.get("list-1")!.songs).toEqual(["s1", "s2"]);
  });

  test("preserves songs as-is for legacy payloads without items", async () => {
    const store = makeMockStore([{ ...baseList }]);
    const controller = controllerFactory(store);

    await controller.upsertList(
      {
        ...baseList,
        songs: ["s1", "s2"],
      },
      OWNER,
    );

    const stored = store._data.get("list-1")!;
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toBeUndefined();
  });

  test("forces user_uid to authenticated uid on create", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertList(
      { title: "New", user_uid: OTHER, private: false, id: "new-1" },
      OWNER,
    );

    expect(store._data.get("new-1")!.user_uid).toBe(OWNER);
  });

  test("strips client-supplied shared_with on create and defaults to empty array", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertList(
      {
        title: "New",
        user_uid: OWNER,
        private: false,
        id: "new-2",
        shared_with: ["sneaky"],
      },
      OWNER,
    );

    expect(store._data.get("new-2")!.shared_with).toEqual([]);
  });

  test("preserves existing user_uid when an editor updates", async () => {
    const store = makeMockStore([{ ...baseList, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertList(
      { ...baseList, title: "Renamed", user_uid: OTHER },
      OTHER,
    );

    const stored = store._data.get("list-1")!;
    expect(stored.user_uid).toBe(OWNER);
    expect(stored.title).toBe("Renamed");
    expect(stored.shared_with).toEqual([OTHER]);
  });

  test("rejects edits from a non-owner, non-shared user", async () => {
    const store = makeMockStore([{ ...baseList }]);
    const controller = controllerFactory(store);

    await expect(
      controller.upsertList({ ...baseList, title: "Hijacked" }, OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("editor cannot change shared_with via upsert", async () => {
    const store = makeMockStore([{ ...baseList, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertList(
      { ...baseList, shared_with: ["someone-new"] },
      OTHER,
    );

    expect(store._data.get("list-1")!.shared_with).toEqual([OTHER]);
  });

  test("owner can update shared_with via upsert", async () => {
    const store = makeMockStore([{ ...baseList, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertList(
      { ...baseList, shared_with: [OTHER, "u3"] },
      OWNER,
    );

    expect(store._data.get("list-1")!.shared_with).toEqual([OTHER, "u3"]);
  });

  test("stamps updatedAt and updatedBy on every upsert", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);
    const before = Date.now();

    await controller.upsertList(
      { title: "New", private: false, id: "ts-1" },
      OWNER,
    );

    const stored = store._data.get("ts-1")!;
    expect(stored.updatedBy).toBe(OWNER);
    expect(typeof stored.updatedAt).toBe("number");
    expect(stored.updatedAt!).toBeGreaterThanOrEqual(before);
  });

  test("sets createdAt on first insert", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);
    const before = Date.now();

    await controller.upsertList(
      { title: "New", private: false, id: "ts-2" },
      OWNER,
    );

    const stored = store._data.get("ts-2")!;
    expect(typeof stored.createdAt).toBe("number");
    expect(stored.createdAt!).toBeGreaterThanOrEqual(before);
  });

  test("preserves existing createdAt across updates", async () => {
    const originalCreatedAt = 1700000000000;
    const store = makeMockStore([{ ...baseList, createdAt: originalCreatedAt }]);
    const controller = controllerFactory(store);

    await controller.upsertList({ ...baseList, title: "Renamed" }, OWNER);

    expect(store._data.get("list-1")!.createdAt).toBe(originalCreatedAt);
  });

  test("strips client-supplied updatedAt, updatedBy, and createdAt", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertList(
      {
        title: "New",
        private: false,
        id: "ts-3",
        updatedAt: 1,
        updatedBy: "spoof",
        createdAt: 1,
      } as any,
      OWNER,
    );

    const stored = store._data.get("ts-3")!;
    expect(stored.updatedBy).toBe(OWNER);
    expect(stored.updatedAt).not.toBe(1);
    expect(stored.createdAt).not.toBe(1);
  });

  test("editor updates updatedBy to their own uid", async () => {
    const store = makeMockStore([{ ...baseList, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertList({ ...baseList, title: "Renamed" }, OTHER);

    expect(store._data.get("list-1")!.updatedBy).toBe(OTHER);
  });
});

describe("addSongToList", () => {
  test("appends to songs when list has no items field (legacy)", async () => {
    const store = makeMockStore([{ ...baseList, songs: ["s1"] }]);
    const controller = controllerFactory(store);

    await controller.addSongToList("list-1", "s2", OWNER);

    const stored = store._data.get("list-1")!;
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

    await controller.addSongToList("list-1", "s2", OWNER);

    const stored = store._data.get("list-1")!;
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

    await controller.addSongToList("list-1", "s1", OWNER);

    const stored = store._data.get("list-1")!;
    expect(stored.songs).toEqual(["s1"]);
    expect(stored.items).toEqual([{ type: "song", songId: "s1" }]);
  });

  test("throws when the list does not exist", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await expect(controller.addSongToList("missing", "s1", OWNER)).rejects.toThrow(
      /missing/,
    );
  });

  test("rejects when the caller is not owner or shared", async () => {
    const store = makeMockStore([{ ...baseList, songs: ["s1"] }]);
    const controller = controllerFactory(store);

    await expect(
      controller.addSongToList("list-1", "s2", OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("allows shared users to add songs", async () => {
    const store = makeMockStore([
      { ...baseList, songs: ["s1"], shared_with: [OTHER] },
    ]);
    const controller = controllerFactory(store);

    await controller.addSongToList("list-1", "s2", OTHER);

    expect(store._data.get("list-1")!.songs).toEqual(["s1", "s2"]);
  });

  test("stamps updatedAt and updatedBy", async () => {
    const store = makeMockStore([{ ...baseList, songs: ["s1"] }]);
    const controller = controllerFactory(store);
    const before = Date.now();

    await controller.addSongToList("list-1", "s2", OWNER);

    const stored = store._data.get("list-1")!;
    expect(stored.updatedBy).toBe(OWNER);
    expect(stored.updatedAt!).toBeGreaterThanOrEqual(before);
  });
});

describe("shareList / unshareList", () => {
  test("only the owner can add a collaborator", async () => {
    const store = makeMockStore([{ ...baseList, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await expect(
      controller.shareList("list-1", "u3", OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("owner can add a collaborator", async () => {
    const store = makeMockStore([{ ...baseList }]);
    const controller = controllerFactory(store);

    await controller.shareList("list-1", "u3", OWNER);

    expect(store._data.get("list-1")!.shared_with).toEqual(["u3"]);
  });

  test("only the owner can remove a collaborator", async () => {
    const store = makeMockStore([{ ...baseList, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await expect(
      controller.unshareList("list-1", OTHER, OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("shareList stamps updatedAt and updatedBy", async () => {
    const store = makeMockStore([{ ...baseList }]);
    const controller = controllerFactory(store);
    const before = Date.now();

    await controller.shareList("list-1", "u3", OWNER);

    const stored = store._data.get("list-1")!;
    expect(stored.updatedBy).toBe(OWNER);
    expect(stored.updatedAt!).toBeGreaterThanOrEqual(before);
  });

  test("unshareList stamps updatedAt and updatedBy", async () => {
    const store = makeMockStore([{ ...baseList, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);
    const before = Date.now();

    await controller.unshareList("list-1", OTHER, OWNER);

    const stored = store._data.get("list-1")!;
    expect(stored.updatedBy).toBe(OWNER);
    expect(stored.updatedAt!).toBeGreaterThanOrEqual(before);
  });
});
