import controllerFactory from "../controller.ts";
import { SetlistSchema } from "../../types/types.ts";
import type { Setlist } from "../../types/types.ts";
import { makeMockStore, makeMockBandsStore } from "./mockStore.ts";

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

describe("setlistById visibility", () => {
  const privateSetlist: Setlist = { ...baseSetlist, private: true };
  const BAND_MEMBER = "u3";
  const band = { id: "band-1", name: "The Band", created_by: OWNER, members: [OWNER, BAND_MEMBER] };

  test("returns a public setlist to an anonymous caller", async () => {
    const controller = controllerFactory(makeMockStore([{ ...baseSetlist }]));

    await expect(controller.setlistById("setlist-1")).resolves.toEqual([baseSetlist]);
  });

  test("hides a private setlist from an anonymous caller", async () => {
    const controller = controllerFactory(makeMockStore([{ ...privateSetlist }]));

    await expect(controller.setlistById("setlist-1")).rejects.toMatchObject({ status: 404 });
  });

  test("hides a private setlist from an unrelated user", async () => {
    const controller = controllerFactory(makeMockStore([{ ...privateSetlist }]));

    await expect(controller.setlistById("setlist-1", OTHER)).rejects.toMatchObject({ status: 404 });
  });

  test("returns a private setlist to its owner", async () => {
    const controller = controllerFactory(makeMockStore([{ ...privateSetlist }]));

    await expect(controller.setlistById("setlist-1", OWNER)).resolves.toEqual([privateSetlist]);
  });

  test("returns a private setlist to a shared collaborator", async () => {
    const shared: Setlist = { ...privateSetlist, shared_with: [OTHER] };
    const controller = controllerFactory(makeMockStore([shared]));

    await expect(controller.setlistById("setlist-1", OTHER)).resolves.toEqual([shared]);
  });

  test("returns a private band setlist to a band member", async () => {
    const bandSetlist: Setlist = { ...privateSetlist, band_id: "band-1" };
    const controller = controllerFactory(makeMockStore([bandSetlist]), makeMockBandsStore([band]));

    await expect(controller.setlistById("setlist-1", BAND_MEMBER)).resolves.toEqual([bandSetlist]);
  });

  test("hides a private band setlist from a non-member", async () => {
    const bandSetlist: Setlist = { ...privateSetlist, band_id: "band-1" };
    const controller = controllerFactory(makeMockStore([bandSetlist]), makeMockBandsStore([band]));

    await expect(controller.setlistById("setlist-1", OTHER)).rejects.toMatchObject({ status: 404 });
  });

  test("reports an unknown id as 404", async () => {
    const controller = controllerFactory(makeMockStore([{ ...baseSetlist }]));

    await expect(controller.setlistById("nope", OWNER)).rejects.toMatchObject({ status: 404 });
  });
});

describe("setlistsByBand", () => {
  const band = { id: "band-1", name: "The Band", created_by: OWNER, members: [OWNER] };
  const bandSetlist: Setlist = { ...baseSetlist, private: true, band_id: "band-1" };

  test("returns the band's setlists to a member", async () => {
    const controller = controllerFactory(makeMockStore([bandSetlist]), makeMockBandsStore([band]));

    await expect(controller.setlistsByBand("band-1", OWNER)).resolves.toEqual([bandSetlist]);
  });

  test("rejects a caller who is not in the band", async () => {
    const controller = controllerFactory(makeMockStore([bandSetlist]), makeMockBandsStore([band]));

    await expect(controller.setlistsByBand("band-1", OTHER)).rejects.toMatchObject({ status: 403 });
  });

  test("rejects when the band does not exist", async () => {
    const controller = controllerFactory(makeMockStore([bandSetlist]), makeMockBandsStore([]));

    await expect(controller.setlistsByBand("band-1", OWNER)).rejects.toMatchObject({ status: 403 });
  });
});

describe("setlist timestamps", () => {
  const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  test("stamps createdAt and updatedAt on create", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertSetlist({ ...baseSetlist, id: "new-ts" }, OWNER);

    const saved = store._data.get("new-ts")!;
    expect(saved.createdAt).toMatch(ISO);
    expect(saved.updatedAt).toMatch(ISO);
  });

  test("preserves the stored createdAt and bumps updatedAt on edit", async () => {
    const store = makeMockStore([
      {
        ...baseSetlist,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist({ ...baseSetlist, title: "Renamed" }, OWNER);

    const saved = store._data.get("setlist-1")!;
    expect(saved.createdAt).toBe("2020-01-01T00:00:00.000Z");
    expect(saved.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
  });

  // mongoStore.upsert replaces the whole document, so a pin toggle that does not
  // carry createdAt forward would silently erase it.
  test("keeps createdAt through a pin toggle", async () => {
    const store = makeMockStore([
      { ...baseSetlist, createdAt: "2020-01-01T00:00:00.000Z" },
    ]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist({ ...baseSetlist, pinned: true }, OWNER);

    const saved = store._data.get("setlist-1")!;
    expect(saved.pinned).toBe(true);
    expect(saved.createdAt).toBe("2020-01-01T00:00:00.000Z");
  });

  test("ignores a client-supplied createdAt on edit", async () => {
    const store = makeMockStore([
      { ...baseSetlist, createdAt: "2020-01-01T00:00:00.000Z" },
    ]);
    const controller = controllerFactory(store);

    await controller.upsertSetlist(
      { ...baseSetlist, createdAt: "2099-01-01T00:00:00.000Z" },
      OWNER,
    );

    expect(store._data.get("setlist-1")!.createdAt).toBe("2020-01-01T00:00:00.000Z");
  });

  test("addSongToSetlist bumps updatedAt and keeps createdAt", async () => {
    const store = makeMockStore([
      { ...baseSetlist, songs: ["s1"], createdAt: "2020-01-01T00:00:00.000Z" },
    ]);
    const controller = controllerFactory(store);

    await controller.addSongToSetlist("setlist-1", "s2", OWNER);

    const saved = store._data.get("setlist-1")!;
    expect(saved.songs).toEqual(["s1", "s2"]);
    expect(saved.createdAt).toBe("2020-01-01T00:00:00.000Z");
    expect(saved.updatedAt).toMatch(ISO);
  });
});

describe("deleteSetlist", () => {
  test("owner can delete their own setlist", async () => {
    const store = makeMockStore([baseSetlist]);
    const controller = controllerFactory(store);

    const result = await controller.deleteSetlist("setlist-1", OWNER);

    expect(result).toEqual({ id: "setlist-1" });
    expect(store._data.has("setlist-1")).toBe(false);
  });

  test("a collaborator in shared_with may edit but not delete", async () => {
    const store = makeMockStore([{ ...baseSetlist, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await expect(controller.deleteSetlist("setlist-1", OTHER)).rejects.toMatchObject({
      status: 403,
    });
    expect(store._data.has("setlist-1")).toBe(true);
  });

  test("a band member may edit but not delete", async () => {
    const store = makeMockStore([{ ...baseSetlist, band_id: "band-1" }]);
    const bands = makeMockBandsStore([
      { id: "band-1", name: "Los Tests", created_by: OWNER, members: [OWNER, OTHER] },
    ]);
    const controller = controllerFactory(store, bands);

    await expect(controller.deleteSetlist("setlist-1", OTHER)).rejects.toMatchObject({
      status: 403,
    });
    expect(store._data.has("setlist-1")).toBe(true);
  });

  test("unknown id is a 404", async () => {
    const store = makeMockStore([baseSetlist]);
    const controller = controllerFactory(store);

    await expect(controller.deleteSetlist("nope", OWNER)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("removeSongEverywhere", () => {
  const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  test("strips the song from songs and items, across owners", async () => {
    const store = makeMockStore([
      {
        ...baseSetlist,
        songs: ["s1", "s2"],
        items: [
          { type: "set", label: "Opening" },
          { type: "song", songId: "s1" },
          { type: "song", songId: "s2" },
        ],
      },
      {
        ...baseSetlist,
        id: "setlist-2",
        user_uid: OTHER,
        songs: ["s2", "s3"],
        items: [{ type: "song", songId: "s2" }, { type: "song", songId: "s3" }],
      },
    ]);
    const controller = controllerFactory(store);

    const touched = await controller.removeSongEverywhere("s2");

    expect(touched).toBe(2);
    const first = store._data.get("setlist-1")!;
    expect(first.songs).toEqual(["s1"]);
    expect(first.items).toEqual([
      { type: "set", label: "Opening" },
      { type: "song", songId: "s1" },
    ]);
    const second = store._data.get("setlist-2")!;
    expect(second.songs).toEqual(["s3"]);
    expect(second.items).toEqual([{ type: "song", songId: "s3" }]);
  });

  test("leaves setlists that never referenced the song untouched", async () => {
    const store = makeMockStore([{ ...baseSetlist, songs: ["s1"] }]);
    const controller = controllerFactory(store);

    const touched = await controller.removeSongEverywhere("s9");

    expect(touched).toBe(0);
    expect(store._data.get("setlist-1")!.songs).toEqual(["s1"]);
  });

  test("bumps updatedAt on the setlists it rewrites", async () => {
    const store = makeMockStore([
      { ...baseSetlist, songs: ["s1"], createdAt: "2020-01-01T00:00:00.000Z" },
    ]);
    const controller = controllerFactory(store);

    await controller.removeSongEverywhere("s1");

    const saved = store._data.get("setlist-1")!;
    expect(saved.updatedAt).toMatch(ISO);
    expect(saved.createdAt).toBe("2020-01-01T00:00:00.000Z");
  });
});
