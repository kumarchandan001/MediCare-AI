/**
 * UnifiedHealthMemory — Persistent cross-domain health memory using
 * IndexedDB for longitudinal data storage. Stores investigation history,
 * wearable trends, medication logs, recovery progression, sleep evolution,
 * activity trends, coaching interactions, and wellness milestones in ONE
 * unified timeline. Designed for multi-day, multi-session persistence.
 */
import { useCallback, useRef, useEffect } from "react";
import type { HealthDomain } from "../UnifiedHealthEngine";

// ── Memory Entry Types ───────────────────
export interface HealthMemoryEntry {
  id: string;
  domain: HealthDomain;
  timestamp: number;
  entryType: "investigation" | "wearable_reading" | "medication_log" | "recovery_milestone" |
    "sleep_record" | "activity_record" | "coaching_interaction" | "wellness_event" |
    "preventive_alert" | "emotional_check" | "nutrition_log";
  summary: string;
  score?: number;
  metadata?: Record<string, unknown>;
  tags: string[];
}

export interface HealthMemoryQuery {
  domain?: HealthDomain;
  entryType?: HealthMemoryEntry["entryType"];
  startDate?: number;
  endDate?: number;
  tags?: string[];
  limit?: number;
}

export interface MemoryStats {
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  domainCounts: Record<string, number>;
  storageEstimate: string;
}

// ── IndexedDB Configuration ─────────────
const DB_NAME = "medicare_health_memory";
const DB_VERSION = 1;
const STORE_NAME = "health_entries";
const MAX_ENTRIES = 10_000;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("domain", "domain", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("entryType", "entryType", { unique: false });
        store.createIndex("domain_timestamp", ["domain", "timestamp"], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function useUnifiedHealthMemory() {
  const dbRef = useRef<IDBDatabase | null>(null);

  useEffect(() => {
    openDB()
      .then(db => { dbRef.current = db; })
      .catch(err => console.warn("[HealthMemory] IndexedDB unavailable:", err));

    return () => {
      dbRef.current?.close();
    };
  }, []);

  /**
   * Store a new health memory entry.
   */
  const store = useCallback(async (entry: Omit<HealthMemoryEntry, "id">): Promise<string> => {
    const db = dbRef.current;
    if (!db) {
      console.warn("[HealthMemory] DB not ready, storing to localStorage fallback");
      return storeFallback(entry);
    }

    const id = `hm-${entry.domain}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullEntry: HealthMemoryEntry = { ...entry, id };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(fullEntry);
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  }, []);

  /**
   * Query health memory entries.
   */
  const query = useCallback(async (q: HealthMemoryQuery): Promise<HealthMemoryEntry[]> => {
    const db = dbRef.current;
    if (!db) return queryFallback(q);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const results: HealthMemoryEntry[] = [];

      let request: IDBRequest;

      if (q.domain) {
        const index = store.index("domain");
        request = index.openCursor(IDBKeyRange.only(q.domain));
      } else {
        const index = store.index("timestamp");
        request = index.openCursor(null, "prev"); // newest first
      }

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor || (q.limit && results.length >= q.limit)) {
          resolve(results);
          return;
        }

        const entry = cursor.value as HealthMemoryEntry;
        let matches = true;

        if (q.startDate && entry.timestamp < q.startDate) matches = false;
        if (q.endDate && entry.timestamp > q.endDate) matches = false;
        if (q.entryType && entry.entryType !== q.entryType) matches = false;
        if (q.tags && q.tags.length > 0) {
          matches = q.tags.some(t => entry.tags.includes(t));
        }

        if (matches) results.push(entry);
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }, []);

  /**
   * Get memory statistics.
   */
  const getStats = useCallback(async (): Promise<MemoryStats> => {
    const db = dbRef.current;
    if (!db) return { totalEntries: 0, oldestEntry: null, newestEntry: null, domainCounts: {}, storageEstimate: "N/A" };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      const countReq = store.count();
      const domainCounts: Record<string, number> = {};
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result as IDBCursorWithValue | null;
        if (cursor) {
          const entry = cursor.value as HealthMemoryEntry;
          domainCounts[entry.domain] = (domainCounts[entry.domain] || 0) + 1;
          if (!oldestEntry || entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
          if (!newestEntry || entry.timestamp > newestEntry) newestEntry = entry.timestamp;
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        const estimate = typeof navigator.storage?.estimate === "function"
          ? "Checking..."
          : "N/A";
        resolve({
          totalEntries: countReq.result || 0,
          oldestEntry,
          newestEntry,
          domainCounts,
          storageEstimate: estimate,
        });
      };
      tx.onerror = () => reject(tx.error);
    });
  }, []);

  /**
   * Prune old entries to keep DB size manageable.
   */
  const prune = useCallback(async (keepCount: number = MAX_ENTRIES): Promise<number> => {
    const db = dbRef.current;
    if (!db) return 0;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const total = countReq.result;
        if (total <= keepCount) {
          resolve(0);
          return;
        }

        const deleteCount = total - keepCount;
        let deleted = 0;
        const index = store.index("timestamp");
        const cursorReq = index.openCursor(); // oldest first

        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result as IDBCursorWithValue | null;
          if (cursor && deleted < deleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      };

      tx.oncomplete = () => resolve(0);
      tx.onerror = () => reject(tx.error);
    });
  }, []);

  /**
   * Get timeline entries for a date range (for CrossDomainTimeline).
   */
  const getTimeline = useCallback(async (
    startDate: number,
    endDate: number,
    domains?: HealthDomain[]
  ): Promise<HealthMemoryEntry[]> => {
    const all = await query({ startDate, endDate, limit: 200 });
    const filtered = domains
      ? all.filter(e => domains.includes(e.domain))
      : all;
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [query]);

  return { store, query, getStats, prune, getTimeline };
}

// ── localStorage Fallback ────────────────
const FALLBACK_KEY = "medicare_health_memory_fallback";

function storeFallback(entry: Omit<HealthMemoryEntry, "id">): string {
  const id = `hm-fb-${Date.now()}`;
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    const entries: HealthMemoryEntry[] = raw ? JSON.parse(raw) : [];
    entries.push({ ...entry, id });
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(entries.slice(-200)));
  } catch { /* ignore */ }
  return id;
}

function queryFallback(q: HealthMemoryQuery): HealthMemoryEntry[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    let entries: HealthMemoryEntry[] = JSON.parse(raw);
    if (q.domain) entries = entries.filter(e => e.domain === q.domain);
    if (q.entryType) entries = entries.filter(e => e.entryType === q.entryType);
    if (q.startDate) entries = entries.filter(e => e.timestamp >= q.startDate!);
    if (q.endDate) entries = entries.filter(e => e.timestamp <= q.endDate!);
    if (q.limit) entries = entries.slice(-q.limit);
    return entries;
  } catch { return []; }
}
