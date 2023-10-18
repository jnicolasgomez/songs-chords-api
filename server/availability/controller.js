// import { nanoid } from 'nanoid';
import * as store from '../../store/dummy.js'
// import * as cache from '../../../store/redis.js'
// import auth from '../auth/index.js'

const TABLE = 'user';


export default function(injectedStore, injectedCache) {
    
    if (!injectedStore) {
        injectedStore = store;
    }
    if (!injectedCache) {
        injectedCache = cache;
    }
    async function listUsers() {
        let  users = await injectedCache.list(TABLE);
        if(!users) {
            console.log('user not in cache')
            users = await injectedStore.list(TABLE);
            cache.upsert(TABLE, users);
        } else {
            console.log("Getting data from cache");
        }
        return users;
    }

    function getUserById(id) {
        return injectedStore.get(TABLE, id);
    }

    async function upsertUser(body) {
        const user = {
            name: body.name,
            username: body.username
        }

        if (body.id) {
            user.id = body.id
        } else {
            user.id = nanoid()
        }

        if (body.password || body.username) {
            await auth.upsert({
                id: user.id,
                username: user.username,
                password: body.password
            })
        }

        return injectedStore.upsert(TABLE, user)
    }
    return { listUsers, getUserById , upsertUser, follow, getFollowing}
}