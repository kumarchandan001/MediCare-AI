/**
 * DynamicSupportCalibration — Dynamically calibrates support intensity
 * based on user health trajectory, emotional state, and engagement patterns.
 */
import { useCallback } from "react";

export interface SupportCalibration {
  proactiveOutreach: boolean;
  checkInFrequency: "high" | "moderate" | "low" | "on_demand";
  supportDepth: "surface" | "moderate" | "deep";
  encouragementLevel: number;
  alertSensitivity: "high" | "balanced" | "low";
  narrative: string;
}

export function useDynamicSupportCalibration() {
  const calibrate = useCallback((healthTrend: "improving" | "stable" | "declining", emotionalState: "positive" | "neutral" | "negative", engagementLevel: number): SupportCalibration => {
    if (healthTrend === "declining" && emotionalState === "negative") {
      return { proactiveOutreach: true, checkInFrequency: "high", supportDepth: "deep", encouragementLevel: 90, alertSensitivity: "high", narrative: "Increased support mode — we're here for you during this challenging time" };
    }
    if (healthTrend === "declining") {
      return { proactiveOutreach: true, checkInFrequency: "moderate", supportDepth: "moderate", encouragementLevel: 75, alertSensitivity: "high", narrative: "Attentive monitoring mode — tracking trends closely and ready to help" };
    }
    if (healthTrend === "improving" && engagementLevel > 70) {
      return { proactiveOutreach: false, checkInFrequency: "low", supportDepth: "surface", encouragementLevel: 85, alertSensitivity: "balanced", narrative: "You're doing great — maintaining light-touch support while you progress" };
    }
    return { proactiveOutreach: false, checkInFrequency: "moderate", supportDepth: "moderate", encouragementLevel: 65, alertSensitivity: "balanced", narrative: "Balanced support mode — available when you need us" };
  }, []);

  return { calibrate };
}
