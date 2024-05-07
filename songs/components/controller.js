import * as store from '../../store/dummy.js'

const SONGS_TABLE = 'songs';
const LISTS_TABLE = 'lists';


export default function(injectedStore, injectedCache) {
    
    if (!injectedStore) {
        injectedStore = store;
    }
    async function listSongs() {
        let songs = await injectedStore.list(SONGS_TABLE);
        let list = songs.map((item) => {
            return {id: item.id, title: item.title}
        });
        return list;
    }

    async function getLists() {
        let lists = await injectedStore.list(LISTS_TABLE);
        return lists;
    }

    function getSongById(id) {
        return injectedStore.get(SONGS_TABLE, id);
    }

    async function upsertSong(body) {
        return injectedStore.upsert(SONGS_TABLE, body)
    }

    async function upsertList(body) {
        return injectedStore.upsert(LISTS_TABLE, body)
    }

    async function getSongByList(id) {
        const currentList =  await injectedStore.get(LISTS_TABLE, id);
        const songsIds = currentList.songs;
        const songsList = await injectedStore.query(SONGS_TABLE, {"id": {$in: songsIds}});
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
    
    return { upsertSong ,
        listSongs,
        getSongById,
        getSongByList,
        getLists,
        upsertList}
}