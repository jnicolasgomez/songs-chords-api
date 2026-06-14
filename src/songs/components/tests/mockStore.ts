import type { Song, Store } from "../../types/types.ts";

export type MockSongStore = Store<Song> & {
  _data: Map<string, Song>;
  remove: (table: string, id: string) => Promise<void>;
};

export function makeMockStore<T extends { id?: string } = Song>(
  seed: T[] = [],
): Store<T> & { _data: Map<string, T>; remove: (table: string, id: string) => Promise<void> } {
  let autoId = 0;
  const data = new Map<string, T>(seed.map((s) => [s.id as string, s]));
  return {
    async list() {
      return [...data.values()];
    },
    async get(_table: string, id: string) {
      return data.get(id) ?? null;
    },
    async upsert(_table: string, body: T) {
      const id = (body.id as string) || `gen-${++autoId}`;
      const existing = data.get(id);
      data.set(id, { ...(existing ?? {}), ...(body as object), id } as T);
      return { id };
    },
    async query(_table: string, conditions: [string, string, unknown][]) {
      return [...data.values()].filter((row) =>
        conditions.every(([field, op, value]) => {
          const v = (row as Record<string, unknown>)[field];
          if (op === "==") return v === value;
          if (op === "array-contains") return Array.isArray(v) && v.includes(value);
          return false;
        }),
      );
    },
    async byUserId(_table: string, userId: string) {
      return [...data.values()].filter((r) => (r as { user_uid?: string }).user_uid === userId);
    },
    async listPublic() {
      return [];
    },
    async byIdsArray(_table: string, ids: string[]) {
      return ids.map((id) => data.get(id)).filter(Boolean) as T[];
    },
    async sharedWithUser(_table: string, userId: string) {
      return [...data.values()].filter(
        (r) => Array.isArray((r as { shared_with?: string[] }).shared_with) && (r as { shared_with?: string[] }).shared_with!.includes(userId),
      );
    },
    async remove(_table: string, id: string) {
      data.delete(id);
    },
    _data: data,
  };
}
