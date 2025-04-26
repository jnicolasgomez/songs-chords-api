import * as store from "../../store/firestore.ts";
import type { Song, Store } from "../types/types.ts";


const SONGS_TABLE = "songs";
const LISTS_TABLE = "lists";




export default function (selectedStore?: Store) {

  let injectedStore: Store = store;
  // If no store is injected, use the default store
  injectedStore = selectedStore || store;

  async function listSongs(userId?: string): Promise<Song[]> {
    if (userId) {
      const songs = (await songsByUser(userId)).concat(await publicSongs());
      return songs;
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

  async function upsertSong(body: any): Promise<{id: string}> {
    return injectedStore.upsert(SONGS_TABLE, body);
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
    listSongs,
    getSongById,
    getSongByList,
    getSongsByIds,
    songsByUser,
  };
}
