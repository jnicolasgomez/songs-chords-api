import * as store from "../../store/firestore.ts";
import type { Song, Store } from "../types/types.ts";
import artistsController from "../../artists/components/index.ts";


const SONGS_TABLE = process.env.SONGS_TABLE_NAME || "songs";
const LISTS_TABLE = process.env.LISTS_TABLE_NAME || "lists";




export default function (selectedStore?: Store<Song>) {

  let injectedStore: Store<Song> = store;
  // If no store is injected, use the default store
  injectedStore = selectedStore || store;

  async function listSongs(userId?: string): Promise<Song[]> {
    if (userId) {
      const [userSongs, pubSongs] = await Promise.all([songsByUser(userId), publicSongs()]);
      const seen = new Set(userSongs.map((s) => s.id));
      return userSongs.concat(pubSongs.filter((s) => !seen.has(s.id)));
    } else {
      return publicSongs();
    }
  }

  async function songsByUser(userId: string): Promise<Song[]> {
    let songs = await injectedStore.byUserId(SONGS_TABLE, userId);
    return songs;
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

  async function upsertSong(body: any): Promise<{id: string}> {
    const result = await injectedStore.upsert(SONGS_TABLE, body);
    if (body.artist) {
      await artistsController.upsertArtist(body.artist);
    }
    return result;
  }

  const ALLOWED_PATCH_FIELDS = [
    'title', 'artist', 'chords-text', 'tags', 'spotifyUrl', 'youtubeUrl', 'public', 'details'
  ] as const;

  async function patchSong(id: string, body: Partial<Song>): Promise<{id: string}> {
    const filteredBody: Partial<Song> = {};
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (field in body) {
        (filteredBody as any)[field] = body[field as keyof Song];
      }
    }
    const result = await injectedStore.upsert(SONGS_TABLE, { ...filteredBody, id } as Song);
    if (body.artist) {
      await artistsController.upsertArtist(body.artist);
    }
    return result;
  }

  async function getSongByList(id: string): Promise<Song[]> {
    const currentList = await injectedStore.get(LISTS_TABLE, id);
    const songsIds = currentList?.songs;
    const songsList = await injectedStore.byIdsArray(SONGS_TABLE, songsIds);
    // Create a map to store the indices of songsIds
    const indexMap: { [key: string]: number } = {};
    songsIds.forEach((id, index) => {
      indexMap[id] = index;
    });
    // Sort songsList based on the order of songsIds
    songsList.sort((a, b) => {
      return indexMap[a.id] - indexMap[b.id];
    });

    return songsList;
  }

  return {
    upsertSong,
    patchSong,
    listSongs,
    getSongById,
    getSongByList,
    getSongsByIds,
    songsByUser,
    songsByArtist,
    songsByBand,
  };
}
