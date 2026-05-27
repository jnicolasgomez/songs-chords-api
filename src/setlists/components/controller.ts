import * as store from "../../store/mongoStore.ts";
import type { Store } from "../../songs/types/types.ts";
import type { Setlist, SetlistItem } from "../types/types.ts";
import { assertCanEdit, assertOwner } from "../../middleware/authz.ts";

function songIdsFromItems(items: SetlistItem[]): string[] {
  return items
    .filter((it): it is Extract<SetlistItem, { type: "song" }> => it.type === "song")
    .map((it) => it.songId);
}

const SETLISTS_TABLE = process.env.LISTS_TABLE_NAME || "lists";

export default function (injectedStore?: Store<Setlist>) {
  let selectedStore: Store<Setlist> = store as unknown as Store<Setlist>;
  // If no store is injected, use the default store
  selectedStore = injectedStore || selectedStore;

  async function getSetlists(): Promise<Setlist[]> {
    let setlists = (await selectedStore.list(SETLISTS_TABLE)).reverse();
    return setlists;
  }

  async function setlistsByUser(userId: string): Promise<Setlist[]> {
    let setlists = await selectedStore.query(SETLISTS_TABLE, {
      $or: [
        { user_uid: userId }, // Setlists that belong to the user
        { shared_with: userId }, // Setlists shared with the user
        { private: false },
        { private: { $exists: false } }, // Setlists where private field does not exist
        { private: null }, // Setlists where private field is explicitly set to null
      ],
    });
    return setlists;
  }

  async function setlistById(id: string): Promise<Setlist[]> {
    let setlists = await selectedStore.query(SETLISTS_TABLE, { id });
    return setlists;
  }

  async function publicSetlists(): Promise<Setlist[]> {
    let setlists = await selectedStore.query(SETLISTS_TABLE, {
      $or: [
        // Public setlists based on private field criteria
        { private: false },
        { private: { $exists: false } }, // Setlists where private field does not exist
        { private: null }, // Setlists where private field is explicitly set to null
      ],
    });
    return setlists.reverse();
  }

  async function upsertSetlist(body: any, uid: string): Promise<{id: string}> {
    const incoming: any = { ...body };
    if (Array.isArray(incoming.items)) {
      incoming.songs = songIdsFromItems(incoming.items as SetlistItem[]);
    }
    let existing: Setlist | null = null;
    if (incoming.id) {
      existing = await selectedStore.get(SETLISTS_TABLE, incoming.id);
    }
    if (existing) {
      assertCanEdit(existing, uid);
      incoming.user_uid = existing.user_uid;
      const isOwner = existing.user_uid === uid;
      if (isOwner && Array.isArray(incoming.shared_with)) {
        // Owner-supplied shared_with wins.
      } else if (Array.isArray(existing.shared_with)) {
        incoming.shared_with = existing.shared_with;
      } else {
        delete incoming.shared_with;
      }
    } else {
      incoming.user_uid = uid;
      delete incoming.shared_with;
    }
    const result = await selectedStore.upsert(SETLISTS_TABLE, incoming);
    return result;
  }

  async function setlistsByBand(bandId: string): Promise<Setlist[]> {
    return selectedStore.query(SETLISTS_TABLE, { band_id: bandId });
  }

  async function shareSetlist(setlistId: string, targetUid: string, uid: string): Promise<{ id: string }> {
    const setlist = await selectedStore.get(SETLISTS_TABLE, setlistId);
    if (!setlist) throw Object.assign(new Error("Setlist not found"), { status: 404 });
    assertOwner(setlist, uid);
    const shared_with: string[] = setlist.shared_with ?? [];
    if (!shared_with.includes(targetUid)) shared_with.push(targetUid);
    const result = await selectedStore.upsert(SETLISTS_TABLE, { ...setlist, shared_with });
    return result;
  }

  async function unshareSetlist(setlistId: string, targetUid: string, uid: string): Promise<{ id: string }> {
    const setlist = await selectedStore.get(SETLISTS_TABLE, setlistId);
    if (!setlist) throw Object.assign(new Error("Setlist not found"), { status: 404 });
    assertOwner(setlist, uid);
    const shared_with = (setlist.shared_with ?? []).filter((u: string) => u !== targetUid);
    const result = await selectedStore.upsert(SETLISTS_TABLE, { ...setlist, shared_with });
    return result;
  }

  async function addSongToSetlist(setlistId: string, songId: string, uid: string): Promise<Setlist> {
    const setlist = await selectedStore.get(SETLISTS_TABLE, setlistId);
    if (!setlist) {
      throw new Error(`Setlist ${setlistId} not found`);
    }
    assertCanEdit(setlist, uid);
    const songs: string[] = setlist.songs ?? [];
    if (!songs.includes(songId)) {
      songs.push(songId);
    }
    const existingItems = Array.isArray(setlist.items) ? (setlist.items as SetlistItem[]) : null;
    const updated: Setlist = { ...setlist, songs };
    if (existingItems) {
      const alreadyInItems = existingItems.some(
        (it) => it.type === "song" && it.songId === songId
      );
      updated.items = alreadyInItems
        ? existingItems
        : [...existingItems, { type: "song", songId }];
    }
    await selectedStore.upsert(SETLISTS_TABLE, updated);
    return updated;
  }

  return {
    getSetlists,
    upsertSetlist,
    setlistsByUser,
    setlistsByBand,
    publicSetlists,
    setlistById,
    addSongToSetlist,
    shareSetlist,
    unshareSetlist,
  };
}
