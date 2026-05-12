/**
 * DistributedIntelligenceCoordinator — Coordinates intelligence across
 * local and remote systems while maintaining data sovereignty.
 */
import { useCallback } from "react";

export interface IntelligenceNode {
  id: string;
  type: "local" | "edge" | "cloud";
  capabilities: string[];
  dataResidency: "local_only" | "regional" | "global";
  latency: number;
  available: boolean;
}

export interface IntelligenceQuery {
  query: string;
  requiredCapabilities: string[];
  privacyLevel: "local_only" | "anonymized_ok" | "aggregate_ok";
  maxLatencyMs: number;
}

export interface IntelligenceRouting {
  selectedNode: IntelligenceNode;
  reason: string;
  dataTransformation: "none" | "anonymize" | "aggregate";
  fallbackNode: IntelligenceNode | null;
}

export function useDistributedIntelligenceCoordinator() {
  const routeQuery = useCallback((query: IntelligenceQuery, nodes: IntelligenceNode[]): IntelligenceRouting | null => {
    const eligible = nodes.filter(n => n.available && query.requiredCapabilities.every(c => n.capabilities.includes(c)) && n.latency <= query.maxLatencyMs);
    if (query.privacyLevel === "local_only") {
      const local = eligible.find(n => n.type === "local" && n.dataResidency === "local_only");
      if (local) return { selectedNode: local, reason: "Privacy requires local-only processing", dataTransformation: "none", fallbackNode: null };
      return null;
    }
    const sorted = eligible.sort((a, b) => {
      if (a.type === "local" && b.type !== "local") return -1;
      if (a.type !== "local" && b.type === "local") return 1;
      return a.latency - b.latency;
    });
    if (sorted.length === 0) return null;
    const transform = sorted[0].type !== "local" ? (query.privacyLevel === "anonymized_ok" ? "anonymize" as const : "aggregate" as const) : "none" as const;
    return { selectedNode: sorted[0], reason: `Selected ${sorted[0].type} node for optimal latency (${sorted[0].latency}ms)`, dataTransformation: transform, fallbackNode: sorted[1] || null };
  }, []);

  return { routeQuery };
}
