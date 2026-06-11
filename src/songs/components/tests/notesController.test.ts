import notesFactory from "../notesController.ts";
import type { Song, SongNote } from "../../types/types.ts";
import { makeMockStore } from "./mockStore.ts";

jest.mock("../../../store/firestore.ts", () => ({}));

const OWNER = "u1";
const SHARED = "u2";
const STRANGER = "u3";

function setup(songs: Song[], notes: SongNote[] = []) {
  const songStore = makeMockStore<Song>(songs);
  const notesStore = makeMockStore<SongNote>(notes);
  const controller = notesFactory(songStore, notesStore);
  return { controller, songStore, notesStore };
}

const baseSong: Song = {
  id: "song-1",
  user_uid: OWNER,
  title: "Song One",
  shared_with: [SHARED],
};

describe("notes: listNotes", () => {
  test("returns only the caller's notes for that song", async () => {
    const { controller } = setup(
      [baseSong],
      [
        { id: "n1", songId: "song-1", userId: OWNER, icon: "mdi-star", title: "mine", text: "" },
        { id: "n2", songId: "song-1", userId: SHARED, icon: "mdi-star", title: "theirs", text: "" },
        { id: "n3", songId: "other-song", userId: OWNER, icon: "mdi-star", title: "other", text: "" },
      ],
    );
    const result = await controller.listNotes("song-1", OWNER);
    expect(result.map((n) => n.id)).toEqual(["n1"]);
  });
});

describe("notes: createNote", () => {
  test("owner can create a note", async () => {
    const { controller, notesStore } = setup([baseSong]);
    const created = await controller.createNote(
      "song-1",
      { icon: "mdi-star", title: "Hello", text: "Body" },
      OWNER,
    );
    expect(created.userId).toBe(OWNER);
    expect(created.songId).toBe("song-1");
    expect(notesStore._data.size).toBe(1);
  });

  test("shared collaborator can create a private note", async () => {
    const { controller } = setup([baseSong]);
    const created = await controller.createNote(
      "song-1",
      { icon: "mdi-star", title: "T", text: "B" },
      SHARED,
    );
    expect(created.userId).toBe(SHARED);
  });

  test("public-song viewer can create a private note", async () => {
    const publicSong: Song = { id: "p1", user_uid: OWNER, title: "P", public: true };
    const { controller } = setup([publicSong]);
    const created = await controller.createNote(
      "p1",
      { icon: "mdi-star", title: "T", text: "B" },
      STRANGER,
    );
    expect(created.userId).toBe(STRANGER);
  });

  test("stranger on a private song is forbidden", async () => {
    const { controller } = setup([baseSong]);
    await expect(
      controller.createNote(
        "song-1",
        { icon: "mdi-star", title: "T", text: "B" },
        STRANGER,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("missing song returns 404", async () => {
    const { controller } = setup([]);
    await expect(
      controller.createNote("ghost", { icon: "mdi-star", title: "T", text: "B" }, OWNER),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("notes: updateNote", () => {
  const note: SongNote = {
    id: "n1",
    songId: "song-1",
    userId: OWNER,
    icon: "mdi-star",
    title: "Original",
    text: "Body",
    hidden: false,
  };

  test("author can update their own note", async () => {
    const { controller, notesStore } = setup([baseSong], [note]);
    const updated = await controller.updateNote("n1", { title: "New" }, OWNER);
    expect(updated.title).toBe("New");
    expect(notesStore._data.get("n1")!.title).toBe("New");
  });

  test("non-author cannot update a note even if shared on the song", async () => {
    const { controller } = setup([baseSong], [note]);
    await expect(
      controller.updateNote("n1", { title: "Hijack" }, SHARED),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("missing note returns 404", async () => {
    const { controller } = setup([baseSong]);
    await expect(
      controller.updateNote("ghost", { title: "x" }, OWNER),
    ).rejects.toMatchObject({ status: 404 });
  });

  test("toggling hidden persists", async () => {
    const { controller, notesStore } = setup([baseSong], [note]);
    await controller.updateNote("n1", { hidden: true }, OWNER);
    expect(notesStore._data.get("n1")!.hidden).toBe(true);
  });
});

describe("notes: deleteNote", () => {
  const note: SongNote = {
    id: "n1",
    songId: "song-1",
    userId: OWNER,
    icon: "mdi-star",
    title: "x",
    text: "",
  };

  test("author can delete their own note", async () => {
    const { controller, notesStore } = setup([baseSong], [note]);
    await controller.deleteNote("n1", OWNER);
    expect(notesStore._data.has("n1")).toBe(false);
  });

  test("non-author cannot delete", async () => {
    const { controller } = setup([baseSong], [note]);
    await expect(controller.deleteNote("n1", SHARED)).rejects.toMatchObject({ status: 403 });
  });
});
