export class StoreCache {
  private _cache = new Map<string, { data: any; expiresAt: number }>();
  private _ttlMs: number;

  constructor(ttlMs = 60_000) {
    this._ttlMs = ttlMs;
  }

  get<T>(key: string): T | undefined {
    const hit = this._cache.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt > Date.now()) {
      return Array.isArray(hit.data) ? [...hit.data] as T : hit.data;
    }
    this._cache.delete(key);
    return undefined;
  }

  set<T>(key: string, data: T): void {
    this._cache.set(key, { data, expiresAt: Date.now() + this._ttlMs });
  }

  invalidate(identifier: string): void {
    for (const key of this._cache.keys()) {
      if (key.includes(identifier)) this._cache.delete(key);
    }
  }

  clear(): void {
    this._cache.clear();
  }
}
