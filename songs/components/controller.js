import * as store from '../../store/dummy.js'

const TABLE = 'songs';


export default function(injectedStore, injectedCache) {
    
    if (!injectedStore) {
        injectedStore = store;
    }
    async function listSongs() {
        let songs = await injectedStore.list(TABLE);
        let list = songs.map((item) => {
            return {id: item.id, title: item.title}
        });
        return list;
    }

    function getSongById(id) {
        return injectedStore.get(TABLE, id);
    }

    async function upsertSong(body) {
        return injectedStore.upsert(TABLE, body)
    }
    return { upsertSong , listSongs, getSongById}
}