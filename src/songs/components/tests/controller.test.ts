import controllerFactory from "../controller.ts";
import type { Song, SongNote } from "../../types/types.ts";
import setlistsController from "../../../setlists/components/index.ts";
import { makeMockStore } from "./mockStore.ts";

jest.mock("../../../store/firestore.ts", () => ({}));
jest.mock("../../../artists/components/index.ts", () => ({
  __esModule: true,
  default: { upsertArtist: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../../setlists/components/index.ts", () => ({
  __esModule: true,
  default: { removeSongEverywhere: jest.fn().mockResolvedValue(0) },
}));

const OWNER = "u1";
const OTHER = "u2";

const baseSong: Song = {
  id: "song-1",
  user_uid: OWNER,
  title: "Song One",
  "chords-text": "C G",
};

describe("upsertSong", () => {
  test("forces user_uid to authenticated uid on create", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertSong(
      { id: "new-1", user_uid: OTHER, title: "x", "chords-text": "C" },
      OWNER,
    );

    expect(store._data.get("new-1")!.user_uid).toBe(OWNER);
  });

  test("strips client-supplied shared_with on create", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertSong(
      {
        id: "new-2",
        user_uid: OWNER,
        title: "x",
        "chords-text": "C",
        shared_with: ["sneaky"],
      },
      OWNER,
    );

    expect(store._data.get("new-2")!.shared_with).toBeUndefined();
  });

  test("preserves existing user_uid when an editor updates", async () => {
    const store = makeMockStore([{ ...baseSong, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertSong(
      { ...baseSong, user_uid: OTHER, title: "Renamed" },
      OTHER,
    );

    const stored = store._data.get("song-1")!;
    expect(stored.user_uid).toBe(OWNER);
    expect(stored.title).toBe("Renamed");
    expect(stored.shared_with).toEqual([OTHER]);
  });

  test("rejects edits from a non-owner, non-shared user", async () => {
    const store = makeMockStore([{ ...baseSong }]);
    const controller = controllerFactory(store);

    await expect(
      controller.upsertSong({ ...baseSong, title: "Hijacked" }, OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("owner can update shared_with", async () => {
    const store = makeMockStore([{ ...baseSong, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertSong(
      { ...baseSong, shared_with: [OTHER, "u3"] },
      OWNER,
    );

    expect(store._data.get("song-1")!.shared_with).toEqual([OTHER, "u3"]);
  });

  test("editor cannot change shared_with via upsert", async () => {
    const store = makeMockStore([{ ...baseSong, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.upsertSong(
      { ...baseSong, shared_with: [OTHER, "u3"] },
      OTHER,
    );

    expect(store._data.get("song-1")!.shared_with).toEqual([OTHER]);
  });
});

describe("patchSong", () => {
  test("rejects when user is not owner or shared", async () => {
    const store = makeMockStore([{ ...baseSong }]);
    const controller = controllerFactory(store);

    await expect(
      controller.patchSong("song-1", { title: "x" }, OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("allows shared user to patch and preserves user_uid", async () => {
    const store = makeMockStore([{ ...baseSong, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.patchSong(
      "song-1",
      { title: "Updated", user_uid: OTHER } as Partial<Song>,
      OTHER,
    );

    const stored = store._data.get("song-1")!;
    expect(stored.title).toBe("Updated");
    expect(stored.user_uid).toBe(OWNER);
  });

  test("ignores shared_with in patch body (must use collaborator endpoints)", async () => {
    const store = makeMockStore([{ ...baseSong, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await controller.patchSong(
      "song-1",
      { title: "Updated", shared_with: ["u3"] } as Partial<Song>,
      OTHER,
    );

    expect(store._data.get("song-1")!.shared_with).toEqual([OTHER]);
  });

  test("404 when song does not exist", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await expect(
      controller.patchSong("missing", { title: "x" }, OWNER),
    ).rejects.toMatchObject({ status: 404 });
  });

  test("allows patching chordpro and ignores disallowed fields", async () => {
    const store = makeMockStore([{ ...baseSong }]);
    const controller = controllerFactory(store);

    await controller.patchSong(
      "song-1",
      { 
        chordpro: "[C]Hello [G]World",
        "chords-text": "Updated Chords",
        user_uid: "sneaky-uid",
        foo: "bar"
      } as any,
      OWNER,
    );

    const updated = store._data.get("song-1")!;
    expect(updated.chordpro).toEqual("[C]Hello [G]World");
    expect(updated["chords-text"]).toEqual("Updated Chords");
    expect(updated.user_uid).toEqual(OWNER); // Should not be modified
    expect((updated as any).foo).toBeUndefined();
  });

  test("allows patching soundcloudUrl and persists it", async () => {
    const store = makeMockStore([{ ...baseSong }]);
    const controller = controllerFactory(store);

    await controller.patchSong(
      "song-1",
      { 
        soundcloudUrl: "https://soundcloud.com/artist/track",
      },
      OWNER,
    );

    const updated = store._data.get("song-1")!;
    expect(updated.soundcloudUrl).toEqual("https://soundcloud.com/artist/track");
  });
});

describe("shareSong / unshareSong", () => {
  test("only the owner can add a collaborator", async () => {
    const store = makeMockStore([{ ...baseSong, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await expect(
      controller.shareSong("song-1", "u3", OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("owner can add a collaborator", async () => {
    const store = makeMockStore([{ ...baseSong }]);
    const controller = controllerFactory(store);

    await controller.shareSong("song-1", "u3", OWNER);

    expect(store._data.get("song-1")!.shared_with).toEqual(["u3"]);
  });

  test("only the owner can remove a collaborator", async () => {
    const store = makeMockStore([{ ...baseSong, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await expect(
      controller.unshareSong("song-1", OTHER, OTHER),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("timestamps", () => {
  const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  test("stamps createdAt and updatedAt on create", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.upsertSong({ id: "new-ts", title: "x" }, OWNER);

    const saved = store._data.get("new-ts")!;
    expect(saved.createdAt).toMatch(ISO);
    expect(saved.updatedAt).toMatch(ISO);
  });

  test("preserves the stored createdAt and bumps updatedAt on edit", async () => {
    const store = makeMockStore([
      {
        ...baseSong,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);
    const controller = controllerFactory(store);

    await controller.upsertSong({ ...baseSong, title: "Renamed" }, OWNER);

    const saved = store._data.get("song-1")!;
    expect(saved.createdAt).toBe("2020-01-01T00:00:00.000Z");
    expect(saved.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    expect(saved.updatedAt).toMatch(ISO);
  });

  test("ignores a client-supplied createdAt on edit", async () => {
    const store = makeMockStore([
      { ...baseSong, createdAt: "2020-01-01T00:00:00.000Z" },
    ]);
    const controller = controllerFactory(store);

    await controller.upsertSong(
      { ...baseSong, createdAt: "2099-01-01T00:00:00.000Z" },
      OWNER,
    );

    expect(store._data.get("song-1")!.createdAt).toBe("2020-01-01T00:00:00.000Z");
  });

  // patchSong relies on Firestore merge:true, so writing createdAt here would
  // restamp songs that predate timestamps and make them look brand new.
  test("patchSong bumps updatedAt but never writes createdAt", async () => {
    const store = makeMockStore([{ ...baseSong }]);
    const controller = controllerFactory(store);

    await controller.patchSong("song-1", { title: "Patched" }, OWNER);

    const saved = store._data.get("song-1")!;
    expect(saved.updatedAt).toMatch(ISO);
    expect("createdAt" in saved).toBe(false);
  });
});

describe("deleteSong", () => {
  test("owner can delete their own song", async () => {
    const store = makeMockStore([baseSong]);
    const controller = controllerFactory(store, makeMockStore<SongNote>());

    const result = await controller.deleteSong("song-1", OWNER);

    expect(result).toEqual({ id: "song-1" });
    expect(store._data.has("song-1")).toBe(false);
  });

  test("a collaborator in shared_with may edit but not delete", async () => {
    const store = makeMockStore([{ ...baseSong, shared_with: [OTHER] }]);
    const controller = controllerFactory(store);

    await expect(controller.deleteSong("song-1", OTHER)).rejects.toMatchObject({
      status: 403,
    });
    expect(store._data.has("song-1")).toBe(true);
  });

  test("an unrelated user cannot delete a public song", async () => {
    const store = makeMockStore([{ ...baseSong, public: true }]);
    const controller = controllerFactory(store);

    await expect(controller.deleteSong("song-1", OTHER)).rejects.toMatchObject({
      status: 403,
    });
    expect(store._data.has("song-1")).toBe(true);
  });

  test("unknown id is a 404", async () => {
    const store = makeMockStore([baseSong]);
    const controller = controllerFactory(store);

    await expect(controller.deleteSong("nope", OWNER)).rejects.toMatchObject({
      status: 404,
    });
  });

  test("cascades into setlists that reference the song", async () => {
    const store = makeMockStore([baseSong]);
    const controller = controllerFactory(store, makeMockStore<SongNote>());

    await controller.deleteSong("song-1", OWNER);

    expect(setlistsController.removeSongEverywhere).toHaveBeenCalledWith("song-1");
  });

  test("deletes every user's private notes on the song", async () => {
    const store = makeMockStore([baseSong]);
    const notes = makeMockStore<SongNote>([
      { id: "n1", songId: "song-1", userId: OWNER, icon: "mdi-star", title: "mine", text: "" },
      { id: "n2", songId: "song-1", userId: OTHER, icon: "mdi-star", title: "theirs", text: "" },
      { id: "n3", songId: "song-9", userId: OWNER, icon: "mdi-star", title: "other song", text: "" },
    ]);
    const controller = controllerFactory(store, notes);

    await controller.deleteSong("song-1", OWNER);

    expect(notes._data.has("n1")).toBe(false);
    expect(notes._data.has("n2")).toBe(false);
    // A note belonging to a different song survives.
    expect(notes._data.has("n3")).toBe(true);
  });

  test("does not remove the song when the setlist cascade fails", async () => {
    const store = makeMockStore([baseSong]);
    const controller = controllerFactory(store);
    (setlistsController.removeSongEverywhere as jest.Mock).mockRejectedValueOnce(
      new Error("mongo down"),
    );

    await expect(controller.deleteSong("song-1", OWNER)).rejects.toThrow("mongo down");
    expect(store._data.has("song-1")).toBe(true);
  });
});
