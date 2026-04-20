import * as store from "../../store/firestore.ts";
import { invalidateCache } from "../../store/firestore.ts";
import type { Artist } from "../types/types.ts";

const ARTISTS_TABLE = "artists";

export default function (injectedStore = store) {
  async function listArtists(): Promise<Artist[]> {
    return injectedStore.list(ARTISTS_TABLE) as Promise<Artist[]>;
  }

  async function upsertArtist(name: string, imageUrl?: string): Promise<{ id: string }> {
    const id = name.toLowerCase().trim();
    const data: Artist = { id, name };
    if (imageUrl) data.imageUrl = imageUrl;
    const result = await injectedStore.upsert(ARTISTS_TABLE, data as any);
    invalidateCache(`list:${ARTISTS_TABLE}`); // bust the cache on write
    return result;
  }

  return { listArtists, upsertArtist };
}
