/**
 * IndexedDBPerformanceLayer — Optimized IndexedDB access patterns
 * for health data with batched writes, read caching, and query optimization.
 */
import { useCallback, useRef } from "react";

export interface IDBPerformanceMetrics {
  readOps: number;
  writeOps: number;
  avgReadTimeMs: number;
  avgWriteTimeMs: number;
  cacheHitRate: number;
  storageUsedMB: number;
  pendingWrites: number;
}

export interface BatchWriteConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  maxPendingWrites: number;
}

export function useIndexedDBPerformanceLayer(batchConfig?: Partial<BatchWriteConfig>) {
  const config = useRef<BatchWriteConfig>({ maxBatchSize: 50, flushIntervalMs: 1000, maxPendingWrites: 200, ...batchConfig });
  const readCache = useRef<Map<string, { data: unknown; cachedAt: number }>>(new Map());
  const pendingWrites = useRef<{ store: string; data: unknown }[]>([]);
  const metrics = useRef<IDBPerformanceMetrics>({ readOps: 0, writeOps: 0, avgReadTimeMs: 0, avgWriteTimeMs: 0, cacheHitRate: 0, storageUsedMB: 0, pendingWrites: 0 });
  const cacheHits = useRef(0);
  const cacheMisses = useRef(0);

  const cachedRead = useCallback((key: string, maxAgeMs = 30000): { hit: boolean; data: unknown | null } => {
    const cached = readCache.current.get(key);
    if (cached && Date.now() - cached.cachedAt < maxAgeMs) {
      cacheHits.current++;
      metrics.current.cacheHitRate = cacheHits.current / (cacheHits.current + cacheMisses.current);
      return { hit: true, data: cached.data };
    }
    cacheMisses.current++;
    metrics.current.cacheHitRate = cacheHits.current / (cacheHits.current + cacheMisses.current);
    return { hit: false, data: null };
  }, []);

  const cacheWrite = useCallback((key: string, data: unknown) => {
    readCache.current.set(key, { data, cachedAt: Date.now() });
    // Evict old entries if cache grows too large
    if (readCache.current.size > 500) {
      const entries = Array.from(readCache.current.entries());
      entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
      for (let i = 0; i < 100; i++) readCache.current.delete(entries[i][0]);
    }
  }, []);

  const queueWrite = useCallback((store: string, data: unknown): boolean => {
    if (pendingWrites.current.length >= config.current.maxPendingWrites) return false;
    pendingWrites.current.push({ store, data });
    metrics.current.pendingWrites = pendingWrites.current.length;
    return true;
  }, []);

  const flushWrites = useCallback((): { store: string; data: unknown }[] => {
    const batch = pendingWrites.current.splice(0, config.current.maxBatchSize);
    metrics.current.pendingWrites = pendingWrites.current.length;
    metrics.current.writeOps += batch.length;
    return batch;
  }, []);

  const shouldFlush = useCallback((): boolean => {
    return pendingWrites.current.length >= config.current.maxBatchSize;
  }, []);

  const getMetrics = useCallback((): IDBPerformanceMetrics => ({ ...metrics.current }), []);

  return { cachedRead, cacheWrite, queueWrite, flushWrites, shouldFlush, getMetrics };
}
