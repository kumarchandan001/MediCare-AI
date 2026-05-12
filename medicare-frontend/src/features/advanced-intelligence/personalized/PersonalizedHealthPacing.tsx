/**
 * PersonalizedHealthPacing — Adapts health guidance pacing to individual
 * readiness, engagement capacity, and cognitive load tolerance.
 */
import { useCallback } from "react";

export interface PacingProfile {
  informationDensity: "minimal" | "moderate" | "detailed";
  changeFrequency: "gradual" | "moderate" | "aggressive";
  sessionLength: "short" | "medium" | "long";
  progressDisclosure: "milestone_only" | "regular" | "detailed_tracking";
  overwhelmThreshold: number;
}

export function usePersonalizedHealthPacing() {
  const computePacing = useCallback((engagement: number, sessionCount: number, recentOverwhelm: boolean): PacingProfile => {
    if (recentOverwhelm || engagement < 30) {
      return { informationDensity: "minimal", changeFrequency: "gradual", sessionLength: "short", progressDisclosure: "milestone_only", overwhelmThreshold: 3 };
    }
    if (sessionCount > 50 && engagement > 70) {
      return { informationDensity: "detailed", changeFrequency: "moderate", sessionLength: "long", progressDisclosure: "detailed_tracking", overwhelmThreshold: 8 };
    }
    return { informationDensity: "moderate", changeFrequency: "gradual", sessionLength: "medium", progressDisclosure: "regular", overwhelmThreshold: 5 };
  }, []);

  return { computePacing };
}
