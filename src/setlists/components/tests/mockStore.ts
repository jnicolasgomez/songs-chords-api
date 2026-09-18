import type { Store } from "../../../songs/types/types.ts";
import type { Setlist } from "../../types/types.ts";
import type { Band } from "../../../bands/types/types.ts";

export type MockStore = Store<Setlist> & { _data: Map<string, Setlist> };

export function makeMockStore(seed: Setlist[] = []): MockStore {
  const data = new Map<string, Setlist>(seed.map((l) => [l.id!, l]));
  return {
    async list() {
      return [...data.values()];
    },
    async get(_table: string, id: string) {
      return data.get(id) ?? null;
    },
    async upsert(_table: string, body: Setlist & { id: string }) {
      data.set(body.id, body);
      return { id: body.id };
    },
    async query(_table: string, filter: Record<string, unknown>) {
      if (filter?.id) {
        const hit = data.get(filter.id as string);
        return hit ? [hit] : [];
      }
      if (filter?.band_id) {
        return [...data.values()].filter((l) => l.band_id === filter.band_id);
      }
      // Mirrors the cascade filter in removeSongEverywhere:
      // { $or: [{ songs: id }, { "items.songId": id }] }
      if (Array.isArray(filter?.$or)) {
        const clauses = filter.$or as Record<string, unknown>[];
        const songId = clauses.find((c) => "songs" in c)?.songs;
        if (songId !== undefined) {
          return [...data.values()].filter(
            (l) =>
              (Array.isArray(l.songs) && l.songs.includes(songId as string)) ||
              (Array.isArray(l.items) &&
                l.items.some((it) => it.type === "song" && it.songId === songId)),
          );
        }
      }
      return [...data.values()];
    },
    async byUserId() {
      return [];
    },
    async listPublic() {
      return [];
    },
    async byIdsArray() {
      return [];
    },
    async sharedWithUser() {
      return [];
    },
    async remove(_table: string, id: string) {
      data.delete(id);
    },
    _data: data,
  };
}

export function makeMockBandsStore(seed: Band[] = []): Store<Band> {
  const data = new Map<string, Band>(seed.map((b) => [b.id!, b]));
  return {
    async list() {
      return [...data.values()];
    },
    async get(_table: string, id: string) {
      return data.get(id) ?? null;
    },
    async upsert(_table: string, body: Band & { id: string }) {
      data.set(body.id, body);
      return { id: body.id };
    },
    async query(_table: string, filter: Record<string, unknown>) {
      if (filter?.id) {
        const hit = data.get(filter.id as string);
        return hit ? [hit] : [];
      }
      return [...data.values()];
    },
    async byUserId() {
      return [];
    },
    async listPublic() {
      return [];
    },
    async byIdsArray() {
      return [];
    },
    async sharedWithUser() {
      return [];
    },
    async remove(_table: string, id: string) {
      data.delete(id);
    },
  };
}
