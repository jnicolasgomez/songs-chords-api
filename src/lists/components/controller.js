import * as store from "../../store/dummy.js";
const LISTS_TABLE = "lists";

export default function (injectedStore) {
  if (!injectedStore) {
    injectedStore = store;
  }

  async function getLists() {
    let lists = await injectedStore.list(LISTS_TABLE);
    return lists;
  }

  async function listsByUser(userId) {
    let lists = await injectedStore.query(LISTS_TABLE, {
      $or: [
        { user_uid: userId }, // Lists that belong to the user
        {
          $or: [
            // Public lists based on private field criteria
            { private: false },
            { private: { $exists: false } }, // Lists where private field does not exist
            { private: null }, // Lists where private field is explicitly set to null
          ],
        }, // Public lists
      ],
    });
    return lists;
  }

  async function listById(id) {
    let lists = await injectedStore.query(LISTS_TABLE, { id });
    return lists;
  }

  async function publicLists() {
    let lists = await injectedStore.query(LISTS_TABLE, {
      $or: [
        // Public lists based on private field criteria
        { private: false },
        { private: { $exists: false } }, // Lists where private field does not exist
        { private: null }, // Lists where private field is explicitly set to null
      ],
    });
    return lists;
  }

  async function upsertList(body) {
    return injectedStore.upsert(LISTS_TABLE, body);
  }

  return {
    getLists,
    upsertList,
    listsByUser,
    publicLists,
    listById,
  };
}
