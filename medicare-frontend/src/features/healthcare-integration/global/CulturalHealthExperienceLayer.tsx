/**
 * CulturalHealthExperienceLayer — Adapts health UX to cultural
 * contexts including communication style, health beliefs, and visual preferences.
 */
import { useCallback } from "react";

export interface CulturalProfile {
  region: string;
  communicationStyle: "direct" | "indirect" | "formal" | "conversational";
  healthBeliefModel: "biomedical" | "holistic" | "traditional" | "integrated";
  familyInvolvement: "individual" | "family_centered" | "community_centered";
  privacySensitivity: "standard" | "high" | "very_high";
  colorPreferences: { primary: string; avoid: string[] };
  adaptations: string[];
}

export function useCulturalHealthExperienceLayer() {
  const getProfile = useCallback((region: string): CulturalProfile => {
    const profiles: Record<string, Partial<CulturalProfile>> = {
      "US": { communicationStyle: "direct", healthBeliefModel: "biomedical", familyInvolvement: "individual", privacySensitivity: "standard" },
      "IN": { communicationStyle: "formal", healthBeliefModel: "integrated", familyInvolvement: "family_centered", privacySensitivity: "high" },
      "JP": { communicationStyle: "indirect", healthBeliefModel: "integrated", familyInvolvement: "family_centered", privacySensitivity: "very_high" },
      "BR": { communicationStyle: "conversational", healthBeliefModel: "holistic", familyInvolvement: "family_centered", privacySensitivity: "standard" },
    };
    const p = profiles[region] || {};
    return { region, communicationStyle: "conversational", healthBeliefModel: "biomedical", familyInvolvement: "individual", privacySensitivity: "standard", colorPreferences: { primary: "#4A90D9", avoid: [] }, adaptations: [], ...p };
  }, []);

  return { getProfile };
}
