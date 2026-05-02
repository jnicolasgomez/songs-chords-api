import * as store from "../../store/mongoStore.ts";
import type { Store } from "../../songs/types/types.ts";
import type { List, ListItem } from "../types/types.ts";
import { assertCanEdit, assertOwner } from "../../middleware/authz.ts";

function songIdsFromItems(items: ListItem[]): string[] {
  return items
    .filter((it): it is Extract<ListItem, { type: "song" }> => it.type === "song")
    .map((it) => it.songId);
}

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

  async function upsertList(body: any, uid: string): Promise<{id: string}> {
    const incoming: any = { ...body };
    delete incoming.createdAt;
    delete incoming.updatedAt;
    delete incoming.updatedBy;
    if (Array.isArray(incoming.items)) {
      incoming.songs = songIdsFromItems(incoming.items as ListItem[]);
    }
    let existing: List | null = null;
    if (incoming.id) {
      existing = await selectedStore.get(LISTS_TABLE, incoming.id);
    }
    const now = Date.now();
    if (existing) {
      assertCanEdit(existing, uid);
      incoming.user_uid = existing.user_uid;
      incoming.createdAt = existing.createdAt ?? now;
      const isOwner = existing.user_uid === uid;
      if (isOwner && Array.isArray(incoming.shared_with)) {
        // Owner-supplied shared_with wins.
      } else {
        incoming.shared_with = Array.isArray(existing.shared_with) ? existing.shared_with : [];
      }
    } else {
      incoming.user_uid = uid;
      incoming.createdAt = now;
      incoming.shared_with = [];
    }
    incoming.updatedAt = now;
    incoming.updatedBy = uid;
    const result = await selectedStore.upsert(LISTS_TABLE, incoming);
    return result;
  }

  async function listsByBand(bandId: string): Promise<List[]> {
    return selectedStore.query(LISTS_TABLE, { band_id: bandId });
  }

  async function shareList(listId: string, targetUid: string, uid: string): Promise<{ id: string }> {
    const list = await selectedStore.get(LISTS_TABLE, listId);
    if (!list) throw Object.assign(new Error("List not found"), { status: 404 });
    assertOwner(list, uid);
    const shared_with: string[] = list.shared_with ?? [];
    if (!shared_with.includes(targetUid)) shared_with.push(targetUid);
    const result = await selectedStore.upsert(LISTS_TABLE, {
      ...list,
      shared_with,
      updatedAt: Date.now(),
      updatedBy: uid,
    });
    return result;
  }

  async function unshareList(listId: string, targetUid: string, uid: string): Promise<{ id: string }> {
    const list = await selectedStore.get(LISTS_TABLE, listId);
    if (!list) throw Object.assign(new Error("List not found"), { status: 404 });
    assertOwner(list, uid);
    const shared_with = (list.shared_with ?? []).filter((u: string) => u !== targetUid);
    const result = await selectedStore.upsert(LISTS_TABLE, {
      ...list,
      shared_with,
      updatedAt: Date.now(),
      updatedBy: uid,
    });
    return result;
  }

  async function addSongToList(listId: string, songId: string, uid: string): Promise<List> {
    const list = await selectedStore.get(LISTS_TABLE, listId);
    if (!list) {
      throw new Error(`List ${listId} not found`);
    }
    assertCanEdit(list, uid);
    const songs: string[] = list.songs ?? [];
    if (!songs.includes(songId)) {
      songs.push(songId);
    }
    const existingItems = Array.isArray(list.items) ? (list.items as ListItem[]) : null;
    const updated: List = {
      ...list,
      songs,
      updatedAt: Date.now(),
      updatedBy: uid,
    };
    if (existingItems) {
      const alreadyInItems = existingItems.some(
        (it) => it.type === "song" && it.songId === songId
      );
      updated.items = alreadyInItems
        ? existingItems
        : [...existingItems, { type: "song", songId }];
    }
    await selectedStore.upsert(LISTS_TABLE, updated);
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

