/**
 * AdaptiveRelationshipIntelligence — Manages the evolving relationship
 * between user and AI companion with trust, familiarity, and boundary awareness.
 */
import { useCallback } from "react";

export interface RelationshipState {
  stage: "introduction" | "building_trust" | "collaborative" | "deeply_familiar" | "lifelong_partner";
  trustLevel: number;
  familiarityScore: number;
  boundaryRespect: number;
  communicationMaturity: number;
  sharedExperiences: number;
  narrative: string;
}

export function useAdaptiveRelationshipIntelligence() {
  const assessRelationship = useCallback((interactions: number, trustScore: number, overrides: number): RelationshipState => {
    const stage = interactions > 500 ? "lifelong_partner" as const : interactions > 200 ? "deeply_familiar" as const : interactions > 50 ? "collaborative" as const : interactions > 10 ? "building_trust" as const : "introduction" as const;
    const boundaryRespect = Math.max(0, 100 - overrides * 2);
    const narratives = {
      introduction: "Getting to know each other — building the foundation of our health partnership",
      building_trust: "Trust is growing — learning your preferences and health patterns",
      collaborative: "We work well together — your health intelligence is deepening",
      deeply_familiar: "A strong partnership — deeply attuned to your health needs",
      lifelong_partner: "A lasting health companion — understanding you on a profound level",
    };
    return { stage, trustLevel: trustScore, familiarityScore: Math.min(100, interactions * 0.2), boundaryRespect, communicationMaturity: Math.min(100, interactions * 0.15 + trustScore * 0.3), sharedExperiences: interactions, narrative: narratives[stage] };
  }, []);

  return { assessRelationship };
}
