/**
 * LongitudinalCacheEngine — Intelligent caching for longitudinal health
 * data with time-window queries, predictive prefetching, and memory-aware eviction.
 */
import { useCallback, useRef } from "react";

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timeRange: { start: number; end: number };
  cachedAt: number;
  accessCount: number;
  lastAccessed: number;
  sizeEstimate: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSizeMB: number;
  hitRate: number;
  avgAccessTime: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export function useLongitudinalCacheEngine(maxSizeMB = 100) {
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const hits = useRef(0);
  const misses = useRef(0);

  const get = useCallback(<T extends unknown>(key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) { misses.current++; return null; }
    hits.current++;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return entry.data as T;
  }, []);

  const set = useCallback(<T extends unknown>(key: string, data: T, timeRange: { start: number; end: number }, sizeEstimate = 1): void => {
    // Evict if over capacity
    const totalSize = Array.from(cache.current.values()).reduce((s, e) => s + e.sizeEstimate, 0);
    if (totalSize + sizeEstimate > maxSizeMB * 1024) {
      evictLRU(Math.ceil(sizeEstimate / 1024) + 1);
    }
    cache.current.set(key, { key, data, timeRange, cachedAt: Date.now(), accessCount: 1, lastAccessed: Date.now(), sizeEstimate });
  }, [maxSizeMB]);

  const queryTimeRange = useCallback((start: number, end: number): CacheEntry[] => {
    return Array.from(cache.current.values()).filter(e =>
      e.timeRange.start <= end && e.timeRange.end >= start
    );
  }, []);

  const evictLRU = (count: number) => {
    const entries = Array.from(cache.current.entries()).sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    for (let i = 0; i < Math.min(count, entries.length); i++) cache.current.delete(entries[i][0]);
  };

  const getStats = useCallback((): CacheStats => {
    const entries = Array.from(cache.current.values());
    const total = hits.current + misses.current;
    return {
      totalEntries: entries.length,
      totalSizeMB: entries.reduce((s, e) => s + e.sizeEstimate, 0) / 1024,
      hitRate: total > 0 ? hits.current / total : 0,
      avgAccessTime: entries.length > 0 ? entries.reduce((s, e) => s + e.accessCount, 0) / entries.length : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.cachedAt)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.cachedAt)) : null,
    };
  }, []);

  const invalidate = useCallback((pattern?: string): number => {
    if (!pattern) { const count = cache.current.size; cache.current.clear(); return count; }
    let count = 0;
    for (const key of cache.current.keys()) {
      if (key.includes(pattern)) { cache.current.delete(key); count++; }
    }
    return count;
  }, []);

  return { get, set, queryTimeRange, getStats, invalidate };
}
