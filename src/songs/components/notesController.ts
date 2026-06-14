import * as defaultSongStore from "../../store/firestore.ts";
import * as defaultNotesStore from "../../store/firestore.ts";
import type { Song, SongNote, SongNotePatch, Store } from "../types/types.ts";

const SONGS_TABLE = process.env.SONGS_TABLE_NAME || "songs";
const NOTES_TABLE = process.env.SONG_NOTES_TABLE_NAME || "song_notes";

export default function (songStore?: Store<Song>, notesStore?: Store<SongNote>) {
  const songs: Store<Song> = songStore || (defaultSongStore as unknown as Store<Song>);
  const notes: Store<SongNote> = notesStore || (defaultNotesStore as unknown as Store<SongNote>);

  async function assertCanReadSong(songId: string, uid: string): Promise<void> {
    const song = await songs.get(SONGS_TABLE, songId);
    if (!song) throw Object.assign(new Error("Song not found"), { status: 404 });
    const isOwner = song.user_uid === uid;
    const isShared = Array.isArray(song.shared_with) && song.shared_with.includes(uid);
    const isPublic = (song as { public?: boolean }).public === true;
    if (!isOwner && !isShared && !isPublic) {
      throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    }
  }

  async function getOwnedNote(noteId: string, songId: string, uid: string): Promise<SongNote> {
    const note = await notes.get(NOTES_TABLE, noteId);
    if (!note) throw Object.assign(new Error("Note not found"), { status: 404 });
    if (note.userId !== uid) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    if (note.songId !== songId) {
      throw Object.assign(new Error("Note does not belong to this song"), { status: 400 });
    }
    return note;
  }

  async function listNotes(songId: string, uid: string): Promise<SongNote[]> {
    await assertCanReadSong(songId, uid);
    return notes.query(NOTES_TABLE, [
      ["songId", "==", songId],
      ["userId", "==", uid],
    ]);
  }

  async function createNote(songId: string, body: SongNotePatch, uid: string): Promise<SongNote> {
    await assertCanReadSong(songId, uid);
    if (body.icon === undefined || body.title === undefined) {
      throw Object.assign(new Error("Icon and title are required"), { status: 400 });
    }
    const now = Date.now();
    const toCreate: SongNote = {
      songId,
      userId: uid,
      icon: body.icon,
      title: body.title,
      text: body.text ?? "",
      hidden: body.hidden ?? false,
      createdAt: now,
      updatedAt: now,
    };
    const { id } = await notes.upsert(NOTES_TABLE, toCreate as SongNote);
    return { ...toCreate, id };
  }

  async function updateNote(songId: string, noteId: string, body: SongNotePatch, uid: string): Promise<SongNote> {
    const existing = await getOwnedNote(noteId, songId, uid);
    const merged: SongNote = {
      ...existing,
      ...(body.icon !== undefined ? { icon: body.icon } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.text !== undefined ? { text: body.text } : {}),
      ...(body.hidden !== undefined ? { hidden: body.hidden } : {}),
      updatedAt: Date.now(),
    };
    await notes.upsert(NOTES_TABLE, merged as SongNote);
    return merged;
  }

  async function deleteNote(songId: string, noteId: string, uid: string): Promise<{ id: string }> {
    await getOwnedNote(noteId, songId, uid);
    const removable = notes as unknown as { remove?: (t: string, id: string) => Promise<void> };
    if (typeof removable.remove !== "function") {
      throw new Error("Store does not support removal");
    }
    await removable.remove(NOTES_TABLE, noteId);
    return { id: noteId };
  }

  return { listNotes, createNote, updateNote, deleteNote };
}
