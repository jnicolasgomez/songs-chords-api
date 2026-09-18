import * as store from "../../store/firestore.ts";
import type { Song, SongNote, Store } from "../types/types.ts";
import artistsController from "../../artists/components/index.ts";
import setlistsController from "../../setlists/components/index.ts";
import { assertCanEdit, assertOwner } from "../../middleware/authz.ts";


const SONGS_TABLE = process.env.SONGS_TABLE_NAME || "songs";
const NOTES_TABLE = process.env.SONG_NOTES_TABLE_NAME || "song_notes";

export default function (selectedStore?: Store<Song>, selectedNotesStore?: Store<SongNote>) {

  let injectedStore: Store<Song> = store;
  // If no store is injected, use the default store
  injectedStore = selectedStore || store;
  const notesStore: Store<SongNote> =
    selectedNotesStore || (store as unknown as Store<SongNote>);

  async function listSongs(userId?: string): Promise<Song[]> {
    if (userId) {
      const [userSongs, pubSongs, sharedSongs] = await Promise.all([
        songsByUser(userId),
        publicSongs(),
        songsSharedWithUser(userId),
      ]);
      const seen = new Set(userSongs.map((s) => s.id));
      const merged = [...userSongs];
      for (const s of [...sharedSongs, ...pubSongs]) {
        if (!seen.has(s.id)) { seen.add(s.id); merged.push(s); }
      }
      return merged;
    } else {
      return publicSongs();
    }
  }

  async function songsByUser(userId: string): Promise<Song[]> {
    let songs = await injectedStore.byUserId(SONGS_TABLE, userId);
    return songs;
  }

  async function songsSharedWithUser(userId: string): Promise<Song[]> {
    return injectedStore.sharedWithUser(SONGS_TABLE, userId);
  }

  async function publicSongs(): Promise<Song[]> {
    let songs = await injectedStore.listPublic(SONGS_TABLE);
    return songs;
  }

  function getSongById(id: string): Promise<Song> {
    return injectedStore.get(SONGS_TABLE, id) as Promise<Song>;
  }

  async function getSongsByIds(idArray: string[]): Promise<Song[]> {
    const songsList = await injectedStore.byIdsArray(SONGS_TABLE, idArray);
    // Create a map to store the indices of songsIds
    const indexMap: { [key: string]: number } = {};
    idArray.forEach((id, index) => {
      indexMap[id] = index;
    });
    // Sort songsList based on the order of songsIds
    songsList.sort((a, b) => {
      return indexMap[a.id] - indexMap[b.id];
    });
    return songsList;
  }

  async function songsByArtist(artist: string): Promise<Song[]> {
    return injectedStore.query(SONGS_TABLE, [["artist", "==", artist]]);
  }

  async function songsByBand(bandId: string): Promise<Song[]> {
    return injectedStore.query(SONGS_TABLE, [["band_id", "==", bandId]]);
  }

  async function upsertSong(body: any, uid: string): Promise<{ id: string }> {
    const incoming: any = { ...body };
    const now = new Date().toISOString();
    let existingCreatedAt: string | undefined;
    if (incoming.id) {
      const existing = await injectedStore.get(SONGS_TABLE, incoming.id);
      if (existing) {
        assertCanEdit(existing, uid);
        existingCreatedAt = existing.createdAt;
        incoming.user_uid = existing.user_uid;
        const isOwner = existing.user_uid === uid;
        if (isOwner && Array.isArray(incoming.shared_with)) {
          // Owner-supplied shared_with wins.
        } else if (Array.isArray(existing.shared_with)) {
          incoming.shared_with = existing.shared_with;
        } else {
          delete incoming.shared_with;
        }
      } else {
        incoming.user_uid = uid;
        delete incoming.shared_with;
      }
    } else {
      incoming.user_uid = uid;
      delete incoming.shared_with;
    }
    // An edit must never restamp creation time, so the stored value wins.
    incoming.createdAt = existingCreatedAt ?? now;
    incoming.updatedAt = now;
    const result = await injectedStore.upsert(SONGS_TABLE, incoming);
    if (incoming.artist) {
      await artistsController.upsertArtist(incoming.artist);
    }
    return result;
  }

  const ALLOWED_PATCH_FIELDS = [
    'title', 'artist', 'chords-text', 'chordpro', 'tags', 'spotifyUrl', 'youtubeUrl', 'soundcloudUrl', 'public', 'details'
  ] as const;

  async function patchSong(id: string, body: Partial<Song>, uid: string): Promise<{ id: string }> {
    const existing = await injectedStore.get(SONGS_TABLE, id);
    if (!existing) throw Object.assign(new Error("Song not found"), { status: 404 });
    assertCanEdit(existing, uid);
    const filteredBody: Partial<Song> = {};
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (field in body) {
        (filteredBody as any)[field] = body[field as keyof Song];
      }
    }
    const result = await injectedStore.upsert(SONGS_TABLE, {
      ...filteredBody,
      id,
      updatedAt: new Date().toISOString(),
    } as Song);
    if (body.artist) {
      await artistsController.upsertArtist(body.artist);
    }
    return result;
  }

  async function shareSong(songId: string, targetUid: string, uid: string): Promise<{ id: string }> {
    const song = await injectedStore.get(SONGS_TABLE, songId);
    if (!song) throw Object.assign(new Error("Song not found"), { status: 404 });
    assertOwner(song, uid);
    const shared_with: string[] = song.shared_with ?? [];
    if (!shared_with.includes(targetUid)) shared_with.push(targetUid);
    return injectedStore.upsert(SONGS_TABLE, { ...song, shared_with });
  }

  async function unshareSong(songId: string, targetUid: string, uid: string): Promise<{ id: string }> {
    const song = await injectedStore.get(SONGS_TABLE, songId);
    if (!song) throw Object.assign(new Error("Song not found"), { status: 404 });
    assertOwner(song, uid);
    const shared_with = (song.shared_with ?? []).filter((u: string) => u !== targetUid);
    return injectedStore.upsert(SONGS_TABLE, { ...song, shared_with });
  }

  /**
   * Hard-deletes a song and everything that points at it: the private notes any
   * user wrote on it, and its id inside every setlist that references it.
   *
   * Only the owner may delete — a collaborator in `shared_with` can edit the
   * song but must not be able to destroy it. The cascades run before the song
   * itself is removed, so a failure part-way through leaves the song reachable
   * rather than leaving orphans pointing at a document that no longer exists.
   */
  async function deleteSong(id: string, uid: string): Promise<{ id: string }> {
    const existing = await injectedStore.get(SONGS_TABLE, id);
    if (!existing) throw Object.assign(new Error("Song not found"), { status: 404 });
    assertOwner(existing, uid);

    await setlistsController.removeSongEverywhere(id);

    // Notes are per-user, so deleting the song clears every user's notes on it,
    // not just the owner's.
    const notes = await notesStore.query(NOTES_TABLE, [["songId", "==", id]]);
    for (const note of notes) {
      if (note.id) await notesStore.remove(NOTES_TABLE, note.id);
    }

    await injectedStore.remove(SONGS_TABLE, id);
    return { id };
  }

  return {
    upsertSong,
    patchSong,
    listSongs,
    getSongById,
    getSongsByIds,
    songsByUser,
    songsByArtist,
    songsByBand,
    shareSong,
    unshareSong,
    deleteSong,
  };
}
