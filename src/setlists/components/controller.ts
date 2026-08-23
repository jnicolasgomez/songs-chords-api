import * as store from "../../store/mongoStore.ts";
import type { Store } from "../../songs/types/types.ts";
import type { Setlist, SetlistItem } from "../types/types.ts";
import { assertCanEdit, assertOwner, canEdit } from "../../middleware/authz.ts";
import type { Band } from "../../bands/types/types.ts";

function songIdsFromItems(items: SetlistItem[]): string[] {
  return items
    .filter((it): it is Extract<SetlistItem, { type: "song" }> => it.type === "song")
    .map((it) => it.songId);
}

const SETLISTS_TABLE = process.env.LISTS_TABLE_NAME || "lists";
const BANDS_TABLE = process.env.BANDS_TABLE_NAME || "bands";

export default function (injectedStore?: Store<Setlist>, injectedBandsStore?: Store<Band>) {
  let selectedStore: Store<Setlist> = store as unknown as Store<Setlist>;
  // If no store is injected, use the default store
  selectedStore = injectedStore || selectedStore;
  const bandsStore: Store<Band> = injectedBandsStore || (store as unknown as Store<Band>);

  async function isBandMember(bandId: string | undefined, uid: string | undefined): Promise<boolean> {
    if (!bandId || !uid) return false;
    const band = await bandsStore.get(BANDS_TABLE, bandId);
    return Array.isArray(band?.members) && band.members.includes(uid);
  }

  // A setlist is readable when it is public, or when the caller owns it, has it
  // shared with them, or belongs to the band it was created for.
  async function canView(setlist: Setlist, uid: string | undefined): Promise<boolean> {
    if (setlist.private !== true) return true;
    if (!uid) return false;
    if (canEdit(setlist, uid)) return true;
    return isBandMember(setlist.band_id, uid);
  }

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

  // Returns a single-element array to preserve the historical response shape.
  // A private setlist the caller may not read is reported as 404 rather than
  // 403, so the endpoint never confirms that an unreachable id exists.
  async function setlistById(id: string, uid?: string): Promise<Setlist[]> {
    const setlists = await selectedStore.query(SETLISTS_TABLE, { id });
    const setlist = setlists[0];
    if (!setlist || !(await canView(setlist, uid))) {
      throw Object.assign(new Error(`Setlist ${id} not found`), { status: 404 });
    }
    return [setlist];
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
    // mongoStore.upsert uses replaceOne, so anything not written here is lost.
    // createdAt must be carried forward explicitly on every edit (pin toggles
    // and song reorders all come through this path).
    const now = new Date().toISOString();
    incoming.createdAt = existing?.createdAt ?? incoming.createdAt ?? now;
    incoming.updatedAt = now;
    const result = await selectedStore.upsert(SETLISTS_TABLE, incoming);
    return result;
  }

  // Band setlists are visible to band members only — the band roster is the
  // access list, so a non-member gets nothing rather than the band's private set.
  async function setlistsByBand(bandId: string, uid: string): Promise<Setlist[]> {
    if (!(await isBandMember(bandId, uid))) {
      throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    }
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
      throw Object.assign(new Error(`Setlist ${setlistId} not found`), { status: 404 });
    }
    assertCanEdit(setlist, uid);
    const songs: string[] = setlist.songs ?? [];
    if (!songs.includes(songId)) {
      songs.push(songId);
    }
    const existingItems = Array.isArray(setlist.items) ? (setlist.items as SetlistItem[]) : null;
    const updated: Setlist = { ...setlist, songs, updatedAt: new Date().toISOString() };
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
