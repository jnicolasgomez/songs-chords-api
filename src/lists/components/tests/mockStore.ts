import type { Store } from "../../../songs/types/types.ts";
import type { List } from "../../types/types.ts";

export type MockStore = Store<List> & { _data: Map<string, List> };

export function makeMockStore(seed: List[] = []): MockStore {
  const data = new Map<string, List>(seed.map((l) => [l.id!, l]));
  return {
    async list() {
      return [...data.values()];
    },
    async get(_table: string, id: string) {
      return data.get(id) ?? null;
    },
    async upsert(_table: string, body: List & { id: string }) {
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
