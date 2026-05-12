/**
 * LongTermMemoryOrchestrator — Manages the AI companion's longitudinal
 * memory of user health journey, preferences, and interaction history.
 */
import { useCallback, useRef } from "react";

export interface MemoryEntry {
  id: string;
  type: "health_event" | "preference" | "milestone" | "conversation" | "insight";
  content: string;
  importance: number;
  emotionalValence: "positive" | "neutral" | "negative";
  timestamp: number;
  decayRate: number;
  references: string[];
}

export interface MemoryQuery {
  topic?: string;
  type?: MemoryEntry["type"];
  minImportance?: number;
  recencyBias?: number;
}

export function useLongTermMemoryOrchestrator() {
  const memories = useRef<MemoryEntry[]>([]);

  const store = useCallback((entry: Omit<MemoryEntry, "id" | "timestamp">): MemoryEntry => {
    const full: MemoryEntry = { ...entry, id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, timestamp: Date.now() };
    memories.current = [...memories.current.slice(-999), full];
    return full;
  }, []);

  const recall = useCallback((query: MemoryQuery, limit = 10): MemoryEntry[] => {
    const now = Date.now();
    let results = [...memories.current];
    if (query.type) results = results.filter(m => m.type === query.type);
    if (query.minImportance) results = results.filter(m => m.importance >= query.minImportance!);
    if (query.topic) results = results.filter(m => m.content.toLowerCase().includes(query.topic!.toLowerCase()));
    // Score by importance + recency with decay
    const recencyBias = query.recencyBias ?? 0.5;
    results.sort((a, b) => {
      const ageA = (now - a.timestamp) / 86400000;
      const ageB = (now - b.timestamp) / 86400000;
      const scoreA = a.importance * (1 - recencyBias) + (1 / (1 + ageA * a.decayRate)) * recencyBias * 100;
      const scoreB = b.importance * (1 - recencyBias) + (1 / (1 + ageB * b.decayRate)) * recencyBias * 100;
      return scoreB - scoreA;
    });
    return results.slice(0, limit);
  }, []);

  const consolidate = useCallback((): { merged: number; pruned: number } => {
    const threshold = Date.now() - 180 * 86400000; // 6 months
    const old = memories.current.filter(m => m.timestamp < threshold && m.importance < 30);
    memories.current = memories.current.filter(m => !old.includes(m));
    return { merged: 0, pruned: old.length };
  }, []);

  return { store, recall, consolidate, getCount: () => memories.current.length };
}
