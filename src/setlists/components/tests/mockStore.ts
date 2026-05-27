import type { Store } from "../../../songs/types/types.ts";
import type { Setlist } from "../../types/types.ts";

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
    _data: data,
  };
}
