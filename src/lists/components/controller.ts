import * as store from "../../store/mongoStore.ts";
import { invalidateTable } from "../../store/mongoStore.ts";
import type { Store } from "../../songs/types/types.ts";
import type { List } from "../types/types.ts";

const LISTS_TABLE = process.env.LISTS_TABLE_NAME || "lists";

export default function (injectedStore?: Store<List>) {
  let selectedStore: Store<List> = store as unknown as Store<List>;
  // If no store is injected, use the default store
  selectedStore = injectedStore || selectedStore;

  async function getLists(): Promise<List[]> {
    let lists = (await selectedStore.list(LISTS_TABLE)).reverse();
    return lists;
  }

  async function listsByUser(userId: string): Promise<List[]> {
    let lists = await selectedStore.query(LISTS_TABLE, {
      $or: [
        { user_uid: userId }, // Lists that belong to the user
        { shared_with: userId }, // Lists shared with the user
        { private: false },
        { private: { $exists: false } }, // Lists where private field does not exist
        { private: null }, // Lists where private field is explicitly set to null
      ],
    });
    return lists;
  }

  async function listById(id: string): Promise<List[]> {
    let lists = await selectedStore.query(LISTS_TABLE, { id });
    return lists;
  }

  async function publicLists(): Promise<List[]> {
    let lists = await selectedStore.query(LISTS_TABLE, {
      $or: [
        // Public lists based on private field criteria
        { private: false },
        { private: { $exists: false } }, // Lists where private field does not exist
        { private: null }, // Lists where private field is explicitly set to null
      ],
    });
    return lists.reverse();
  }

  async function upsertList(body: any): Promise<{id: string}> {
    const result = await selectedStore.upsert(LISTS_TABLE, body);
    invalidateTable(LISTS_TABLE);
    return result;
  }

  async function listsByBand(bandId: string): Promise<List[]> {
    return selectedStore.query(LISTS_TABLE, { band_id: bandId });
  }

  async function shareList(listId: string, targetUid: string): Promise<{ id: string }> {
    const list = await selectedStore.get(LISTS_TABLE, listId);
    if (!list) throw Object.assign(new Error("List not found"), { status: 404 });
    const shared_with: string[] = list.shared_with ?? [];
    if (!shared_with.includes(targetUid)) shared_with.push(targetUid);
    const result = await selectedStore.upsert(LISTS_TABLE, { ...list, shared_with });
    invalidateTable(LISTS_TABLE);
    return result;
  }

  async function unshareList(listId: string, targetUid: string): Promise<{ id: string }> {
    const list = await selectedStore.get(LISTS_TABLE, listId);
    if (!list) throw Object.assign(new Error("List not found"), { status: 404 });
    const shared_with = (list.shared_with ?? []).filter((uid: string) => uid !== targetUid);
    const result = await selectedStore.upsert(LISTS_TABLE, { ...list, shared_with });
    invalidateTable(LISTS_TABLE);
    return result;
  }

  async function addSongToList(listId: string, songId: string): Promise<List> {
    const list = await selectedStore.get(LISTS_TABLE, listId);
    if (!list) {
      throw new Error(`List ${listId} not found`);
    }
    const songs: string[] = list.songs ?? [];
    if (!songs.includes(songId)) {
      songs.push(songId);
    }
    const updated = { ...list, songs };
    await selectedStore.upsert(LISTS_TABLE, updated);
    invalidateTable(LISTS_TABLE);
    return updated;
  }

  return {
    getLists,
    upsertList,
    listsByUser,
    listsByBand,
    publicLists,
    listById,
    addSongToList,
    shareList,
    unshareList,
  };
}

