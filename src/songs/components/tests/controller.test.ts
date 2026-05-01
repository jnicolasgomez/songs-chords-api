import controllerFactory from "../controller.ts";
import type { Song } from "../../types/types.ts";
import { makeMockStore } from "./mockStore.ts";

jest.mock("../../../store/firestore.ts", () => ({}));
jest.mock("../../../artists/components/index.ts", () => ({
  __esModule: true,
  default: { upsertArtist: jest.fn().mockResolvedValue(undefined) },
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
