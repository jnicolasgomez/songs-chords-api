import * as store from "../../store/dummy.js";

const SONGS_TABLE = "songs";
const LISTS_TABLE = "lists";

export default function (injectedStore) {
  if (!injectedStore) {
    injectedStore = store;
  }
  async function listSongs(userId) {
    if (userId) {
      return (await songsByUser(userId)).concat(await publicSongs());
    } else {
      return publicSongs();
    }
  }

  async function songsByUser(userId) {
    let songs = await injectedStore.byUserId(SONGS_TABLE, userId);
    return songs;
  }

  async function publicSongs() {
    let songs = await injectedStore.listPublic(SONGS_TABLE);
    return songs;
  }

  function getSongById(id) {
    return injectedStore.get(SONGS_TABLE, id);
  }

  function getSongsByIds(idArray) {
    return injectedStore.byIdsArray(SONGS_TABLE, idArray);
  }

  async function upsertSong(body) {
    return injectedStore.upsert(SONGS_TABLE, body);
  }

  async function getSongByList(id) {
    const currentList = await injectedStore.get(LISTS_TABLE, id);
    const songsIds = currentList.songs;
    const songsList = await injectedStore.byIdsArray(SONGS_TABLE, songsIds);
    // Create a map to store the indices of songsIds
    const indexMap = {};
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
