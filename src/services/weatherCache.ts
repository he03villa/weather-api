import { WeatherResponse } from "./weatherService";

interface CacheEntry {
  value: WeatherResponse;
  expiresAt: number;
}

export class WeatherCache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMinutes: number = 10) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(key: string): WeatherResponse | null {
    const normalizedKey = key.trim().toLowerCase();
    const entry = this.store.get(normalizedKey);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(normalizedKey);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: WeatherResponse): void {
    const normalizedKey = key.trim().toLowerCase();
    this.store.set(normalizedKey, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const weatherCache = new WeatherCache(10);
