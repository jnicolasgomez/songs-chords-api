import type { Song, Store } from "../../types/types.ts";

export type MockSongStore = Store<Song> & { _data: Map<string, Song> };

export function makeMockStore(seed: Song[] = []): MockSongStore {
  const data = new Map<string, Song>(seed.map((s) => [s.id!, s]));
  return {
    async list() {
      return [...data.values()];
    },
    async get(_table: string, id: string) {
      return data.get(id) ?? null;
    },
    async upsert(_table: string, body: Song & { id: string }) {
      const id = body.id;
      const existing = data.get(id);
      data.set(id, { ...(existing ?? {}), ...body });
      return { id };
    },
    async query() {
      return [];
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
    _data: data,
  };
}
