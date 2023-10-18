// import { nanoid } from 'nanoid';
import * as store from '../../store/dummy.js'
import availability from './index.js';
// import * as cache from '../../../store/redis.js'
// import auth from '../auth/index.js'

const TABLE = 'availability';


export default function(injectedStore, injectedCache) {
    
    if (!injectedStore) {
        injectedStore = store;
    }
    // if (!injectedCache) {
    //     injectedCache = cache;
    // }
    async function listAvailability() {
        //let  users = await injectedCache.list(TABLE);
        //if(!users) {
        let availability = await injectedStore.list(TABLE);
        //cache.upsert(TABLE, users);
        //} else {
        //    console.log("Getting data from cache");
        //}
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