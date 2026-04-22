import logger from "../utils/logger.ts";

export class StoreCache {
  private _cache = new Map<string, { data: any; expiresAt: number }>();
  private _ttlMs: number;
  private _name: string;

  constructor(name: string, ttlMs = 60_000) {
    this._name = name;
    this._ttlMs = ttlMs;
  }

  get<T>(key: string): T | undefined {
    const hit = this._cache.get(key);
    if (!hit) {
      logger.debug("cache miss", { cache: this._name, key });
      return undefined;
    }
    if (hit.expiresAt > Date.now()) {
      logger.debug("cache hit", { cache: this._name, key });
      return Array.isArray(hit.data) ? [...hit.data] as T : hit.data;
    }
    this._cache.delete(key);
    logger.debug("cache expired", { cache: this._name, key });
    return undefined;
  }

  set<T>(key: string, data: T): void {
    this._cache.set(key, { data, expiresAt: Date.now() + this._ttlMs });
    logger.debug("cache set", { cache: this._name, key });
  }

  invalidate(prefix: string): void {
    const match = prefix + ":";
    let removed = 0;
    for (const key of this._cache.keys()) {
      if (key.startsWith(match)) {
        this._cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug("cache invalidate", { cache: this._name, prefix, removed });
    }
  }

  clear(): void {
    this._cache.clear();
  }
}
