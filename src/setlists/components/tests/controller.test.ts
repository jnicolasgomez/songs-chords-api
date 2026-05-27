import controllerFactory from "../controller.ts";
import { SetlistSchema } from "../../types/types.ts";
import type { Setlist } from "../../types/types.ts";
import { makeMockStore } from "./mockStore.ts";

// Prevent mongoStore from calling connect() at import time, which logs async
// errors after tests finish ("Cannot log after tests are done").
jest.mock("../../../store/mongoStore.ts", () => ({}));

const OWNER = "u1";
const OTHER = "u2";

const baseSetlist: Setlist = {
  id: "setlist-1",
  title: "Demo",
  user_uid: OWNER,
  private: false,
};

describe("SetlistSchema", () => {
  test("accepts a setlist with mixed items (song, set, pause)", () => {
    const result = SetlistSchema.safeParse({
      ...baseSetlist,
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
    const result = SetlistSchema.safeParse({
      ...baseSetlist,
      items: [{ type: "intermezzo", label: "x" }],
    });
    expect(result.success).toBe(false);
  });

  test("rejects a pause without minutes", () => {
    const result = SetlistSchema.safeParse({
      ...baseSetlist,
      items: [{ type: "pause", label: "Break" }],
    });
    expect(result.success).toBe(false);
  });

  test("accepts a legacy songs-only payload (no items)", () => {
    const result = SetlistSchema.safeParse({
      ...baseSetlist,
      songs: ["s1", "s2"],
    });
    expect(result.success).toBe(true);
  });
});

describe("upsertSetlist", () => {
  test("derives songs from items when items is provided", async () => {
    const store = makeMockStore([{ ...baseSetlist }]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      {
        ...baseSetlist,
        items: [
          { type: "set", label: "Opening" },
          { type: "song", songId: "s1" },
          { type: "pause", minutes: 10 },
          { type: "song", songId: "s2" },
        ],
      },
      OWNER,
    );

    const stored = store._data.get("setlist-1")!;
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toHaveLength(4);
  });

  test("overwrites incoming songs with values derived from items", async () => {
    const store = makeMockStore([{ ...baseSetlist }]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      {
        ...baseSetlist,
        songs: ["stale-id"],
        items: [
          { type: "song", songId: "s1" },
          { type: "song", songId: "s2" },
        ],
      },
      OWNER,
    );

    expect(store._data.get("setlist-1")!.songs).toEqual(["s1", "s2"]);
  });

  test("preserves songs as-is for legacy payloads without items", async () => {
    const store = makeMockStore([{ ...baseSetlist }]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      {
        ...baseSetlist,
        songs: ["s1", "s2"],
      },
      OWNER,
    );

    const stored = store._data.get("setlist-1")!;
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toBeUndefined();
  });

  test("forces user_uid to authenticated uid on create", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      { title: "New", user_uid: OTHER, private: false, id: "new-1" },
      OWNER,
    );

    expect(store._data.get("new-1")!.user_uid).toBe(OWNER);
  });

  test("strips client-supplied shared_with on create", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      {
        title: "New",
        user_uid: OWNER,
        private: false,
        id: "new-2",
        shared_with: ["sneaky"],
      },
      OWNER,
    );

    expect(store._data.get("new-2")!.shared_with).toBeUndefined();
  });

  test("preserves existing user_uid when an editor updates", async () => {
    const store = makeMockStore([{ ...baseSetlist, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      { ...baseSetlist, title: "Renamed", user_uid: OTHER },
      OTHER,
    );

    const stored = store._data.get("setlist-1")!;
    expect(stored.user_uid).toBe(OWNER);
    expect(stored.title).toBe("Renamed");
    expect(stored.shared_with).toEqual([OTHER]);
  });

  test("rejects edits from a non-owner, non-shared user", async () => {
    const store = makeMockStore([{ ...baseSetlist }]);
    const controller = controllerFactory(store);

    await expect(
      controller.upsertSetlist({ ...baseSetlist, title: "Hijacked" }, OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("editor cannot change shared_with via upsert", async () => {
    const store = makeMockStore([{ ...baseSetlist, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      { ...baseSetlist, shared_with: ["someone-new"] },
      OTHER,
    );

    expect(store._data.get("setlist-1")!.shared_with).toEqual([OTHER]);
  });

  test("owner can update shared_with via upsert", async () => {
    const store = makeMockStore([{ ...baseSetlist, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      { ...baseSetlist, shared_with: [OTHER, "u3"] },
      OWNER,
    );

    expect(store._data.get("setlist-1")!.shared_with).toEqual([OTHER, "u3"]);
  });
});

describe("addSongToSetlist", () => {
  test("appends to songs when setlist has no items field (legacy)", async () => {
    const store = makeMockStore([{ ...baseSetlist, songs: ["s1"] }]);
    const controller = controllerFactory(store);

    await controller.addSongToSetlist("setlist-1", "s2", OWNER);

    const stored = store._data.get("setlist-1")!;
    expect(stored.songs).toEqual(["s1", "s2"]);
    expect(stored.items).toBeUndefined();
  });

  test("appends to both songs and items when setlist already uses items", async () => {
    const store = makeMockStore([
      {
        ...baseSetlist,
        songs: ["s1"],
        items: [
          { type: "set", label: "Opening" },
          { type: "song", songId: "s1" },
        ],
      },
    ]);
    const controller = controllerFactory(store);

    await controller.addSongToSetlist("setlist-1", "s2", OWNER);

    const stored = store._data.get("setlist-1")!;
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
        ...baseSetlist,
        songs: ["s1"],
        items: [{ type: "song", songId: "s1" }],
      },
    ]);
    const controller = controllerFactory(store);

    await controller.addSongToSetlist("setlist-1", "s1", OWNER);

    const stored = store._data.get("setlist-1")!;
    expect(stored.songs).toEqual(["s1"]);
    expect(stored.items).toEqual([{ type: "song", songId: "s1" }]);
  });

  test("throws when the setlist does not exist", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await expect(controller.addSongToSetlist("missing", "s1", OWNER)).rejects.toThrow(
      /missing/,
    );
  });

  test("rejects when the caller is not owner or shared", async () => {
    const store = makeMockStore([{ ...baseSetlist, songs: ["s1"] }]);
    const controller = controllerFactory(store);

    await expect(
      controller.addSongToSetlist("setlist-1", "s2", OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("allows shared users to add songs", async () => {
    const store = makeMockStore([
      { ...baseSetlist, songs: ["s1"], shared_with: [OTHER] },
    ]);
    const controller = controllerFactory(store);

    await controller.addSongToSetlist("setlist-1", "s2", OTHER);

    expect(store._data.get("setlist-1")!.songs).toEqual(["s1", "s2"]);
  });
});

describe("shareSetlist / unshareSetlist", () => {
  test("only the owner can add a collaborator", async () => {
    const store = makeMockStore([{ ...baseSetlist, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await expect(
      controller.shareSetlist("setlist-1", "u3", OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("owner can add a collaborator", async () => {
    const store = makeMockStore([{ ...baseSetlist }]);
    const controller = controllerFactory(store);

    await controller.shareSetlist("setlist-1", "u3", OWNER);

    expect(store._data.get("setlist-1")!.shared_with).toEqual(["u3"]);
  });

  test("only the owner can remove a collaborator", async () => {
    const store = makeMockStore([{ ...baseSetlist, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await expect(
      controller.unshareSetlist("setlist-1", OTHER, OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });
});
