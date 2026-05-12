/**
 * LocalAdaptationLayer — Manages local-only model adaptation using
 * on-device data without sending health information to external servers.
 */
import { useCallback, useRef } from "react";

export interface LocalAdaptation {
  id: string;
  domain: string;
  adaptationType: "threshold" | "preference" | "pattern" | "baseline";
  originalValue: unknown;
  adaptedValue: unknown;
  confidence: number;
  dataPointsUsed: number;
  lastUpdated: number;
  privacyGuarantee: string;
}

export function useLocalAdaptationLayer() {
  const adaptations = useRef<Map<string, LocalAdaptation>>(new Map());

  const adapt = useCallback((domain: string, type: LocalAdaptation["adaptationType"], original: unknown, adapted: unknown, dataPoints: number): LocalAdaptation => {
    const adaptation: LocalAdaptation = {
      id: `local-${domain}-${type}`, domain, adaptationType: type,
      originalValue: original, adaptedValue: adapted,
      confidence: Math.min(95, 30 + dataPoints * 2), dataPointsUsed: dataPoints,
      lastUpdated: Date.now(),
      privacyGuarantee: "All adaptation computed locally — no health data transmitted",
    };
    adaptations.current.set(adaptation.id, adaptation);
    return adaptation;
  }, []);

  const getAdaptations = useCallback((domain?: string): LocalAdaptation[] => {
    const all = Array.from(adaptations.current.values());
    return domain ? all.filter(a => a.domain === domain) : all;
  }, []);

  const resetAdaptations = useCallback((domain?: string): number => {
    if (!domain) { const count = adaptations.current.size; adaptations.current.clear(); return count; }
    let count = 0;
    for (const [id, a] of adaptations.current) { if (a.domain === domain) { adaptations.current.delete(id); count++; } }
    return count;
  }, []);

  return { adapt, getAdaptations, resetAdaptations };
}
