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
    let songs = await injectedStore.query(SONGS_TABLE, {
      $or: [{ user_uid: userId }],
    });
    return songs;
  }

  async function publicSongs() {
    let songs = await injectedStore.query(SONGS_TABLE, {
      $or: [
        { private: false },
        { private: { $exists: false } },
        { private: null },
      ],
    });
    return songs;
  }

  function getSongById(id) {
    return injectedStore.get(SONGS_TABLE, id);
  }

  async function getSongsByIds(idArray) {
    const songsList = await injectedStore.query(SONGS_TABLE, {
      id: { $in: idArray },
    });
    // Create a map to store the indices of songsIds
    const indexMap = {};
    idArray.forEach((id, index) => {
      indexMap[id] = index;
    });
    // Sort songsList based on the order of songsIds
    songsList.sort((a, b) => {
      return indexMap[a.id] - indexMap[b.id];
    });
    return songsList;
  }

  async function upsertSong(body) {
    return injectedStore.upsert(SONGS_TABLE, body);
  }

  async function getSongByList(id) {
    const currentList = await injectedStore.get(LISTS_TABLE, id);
    const songsIds = currentList.songs;
    const songsList = await injectedStore.query(SONGS_TABLE, {
      id: { $in: songsIds },
    });
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

  return { upsertSong, listSongs, getSongById, getSongByList, getSongsByIds };
}
