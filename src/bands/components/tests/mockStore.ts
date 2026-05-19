import type { Store } from "../../../songs/types/types.ts";
import type { Band } from "../../types/types.ts";

export type MockStore = Store<Band> & { _data: Map<string, Band> };

export function makeMockStore(seed: Band[] = []): MockStore {
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
      if (filter?.members) {
        const uid = filter.members as string;
        return [...data.values()].filter((b) => (b.members ?? []).includes(uid));
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
