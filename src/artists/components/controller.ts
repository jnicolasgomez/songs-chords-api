import * as store from "../../store/firestore.ts";
import type { Artist } from "../types/types.ts";

const ARTISTS_TABLE = "artists";

export default function (injectedStore = store) {
  async function listArtists(): Promise<Artist[]> {
    return injectedStore.list(ARTISTS_TABLE) as Promise<Artist[]>;
  }

  async function upsertArtist(name: string): Promise<{ id: string }> {
    const id = name.toLowerCase().trim();
    return injectedStore.upsert(ARTISTS_TABLE, { id, name } as any);
  }

  return { listArtists, upsertArtist };
}
