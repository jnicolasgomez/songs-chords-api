import controller from "./notesController.ts";
import * as store from "../../store/firestore.ts";
import type { Song, SongNote, Store } from "../types/types.ts";

export default controller(
  store as unknown as Store<Song>,
  store as unknown as Store<SongNote>,
);
