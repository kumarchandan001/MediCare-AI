/**
 * EcosystemCompanionEvolution — Evolves the AI companion to operate
 * within the broader healthcare ecosystem with cross-system awareness.
 */
import { useCallback } from "react";

export interface EcosystemAwareCompanion {
  awarenessLevel: "isolated" | "connected" | "ecosystem_aware" | "collaborative";
  connectedSystems: string[];
  crossSystemInsights: { source: string; insight: string; relevance: number }[];
  collaborationReadiness: number;
  evolutionStage: number;
}

export function useEcosystemCompanionEvolution() {
  const assessEvolution = useCallback((connectedSystems: string[], interactionCount: number): EcosystemAwareCompanion => {
    const level = connectedSystems.length > 5 ? "collaborative" as const : connectedSystems.length > 2 ? "ecosystem_aware" as const : connectedSystems.length > 0 ? "connected" as const : "isolated" as const;
    return {
      awarenessLevel: level, connectedSystems,
      crossSystemInsights: connectedSystems.map(s => ({ source: s, insight: `Integrated context from ${s}`, relevance: 70 })),
      collaborationReadiness: Math.min(95, connectedSystems.length * 15 + interactionCount * 0.1),
      evolutionStage: connectedSystems.length > 3 ? 4 : connectedSystems.length > 1 ? 3 : connectedSystems.length > 0 ? 2 : 1,
    };
  }, []);

  return { assessEvolution };
}
