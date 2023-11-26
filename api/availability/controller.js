import * as store from '../../store/dummy.js'
import availability from './index.js';

const TABLE = 'availability';


export default function(injectedStore, ) {
    
    if (!injectedStore) {
        injectedStore = store;
    }
    async function listAvailability() {
        let availability = await injectedStore.list(TABLE);
        return availability;
    }

    function getUserById(id) {
        return injectedStore.get(TABLE, id);
    }

    async function upsertAvailablity(body) {
        return injectedStore.upsert(TABLE, body)
    }
    return { upsertAvailablity , listAvailability}
}