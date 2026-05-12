/**
 * LongitudinalEvidencePipeline — Aggregates evidence streams from wearables,
 * self-reports, and clinical records over weeks/months into a unified
 * evidence graph that feeds the reasoning engine's longitudinal analysis.
 */
import { useCallback } from "react";

export interface EvidenceNode {
  id: string;
  source: "wearable" | "self_report" | "clinical_record" | "medication_log";
  timestamp: number;
  metric: string;
  value: number;
  confidence: number; // 0-1
}

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  temporalSpanDays: number;
  dominantSource: EvidenceNode["source"];
  gapCount: number; // number of days with no evidence
}

export function useLongitudinalEvidencePipeline() {
  const buildGraph = useCallback((rawNodes: EvidenceNode[]): EvidenceGraph => {
    if (rawNodes.length === 0) {
      return { nodes: [], temporalSpanDays: 0, dominantSource: "self_report", gapCount: 0 };
    }

    const sorted = [...rawNodes].sort((a, b) => a.timestamp - b.timestamp);
    const spanMs = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    const spanDays = Math.ceil(spanMs / (1000 * 60 * 60 * 24));

    // Count source frequency
    const sourceCounts: Record<string, number> = {};
    sorted.forEach(n => {
      sourceCounts[n.source] = (sourceCounts[n.source] || 0) + 1;
    });
    const dominantSource = Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)[0][0] as EvidenceNode["source"];

    // Calculate gaps (days with zero evidence)
    const daySet = new Set<string>();
    sorted.forEach(n => {
      daySet.add(new Date(n.timestamp).toISOString().slice(0, 10));
    });
    const gapCount = Math.max(0, spanDays - daySet.size);

    return {
      nodes: sorted,
      temporalSpanDays: spanDays,
      dominantSource,
      gapCount,
    };
  }, []);

  return { buildGraph };
}
