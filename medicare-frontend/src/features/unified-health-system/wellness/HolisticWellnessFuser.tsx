/**
 * HolisticWellnessFuser — Fuses daily wellness check-ins, coaching
 * interactions, and behavioral signals into a singular wellness profile.
 * Generates holistic wellness scores and themes.
 */
import { useCallback } from "react";
import type { HealthDomain, DomainSignal } from "../UnifiedHealthEngine";

export interface WellnessProfile {
  overallWellnessScore: number; // 0-100
  dominantTheme: "thriving" | "balanced" | "fatigued" | "stressed" | "recovering";
  strengths: HealthDomain[];
  areasForGrowth: HealthDomain[];
  narrative: string;
}

export function useHolisticWellnessFuser() {
  const fuse = useCallback((
    signals: Map<HealthDomain, DomainSignal>
  ): WellnessProfile => {
    let totalScore = 0;
    let count = 0;
    const strengths: HealthDomain[] = [];
    const areasForGrowth: HealthDomain[] = [];

    // Evaluate core wellness contributors
    const coreDomains: HealthDomain[] = ["wellness", "emotional", "sleep", "activity", "nutrition", "coaching"];
    
    for (const domain of coreDomains) {
      const signal = signals.get(domain);
      if (signal) {
        totalScore += signal.score;
        count++;

        if (signal.score > 75) {
          strengths.push(domain);
        } else if (signal.score < 50) {
          areasForGrowth.push(domain);
        }
      }
    }

    const overallWellnessScore = count > 0 ? Math.round(totalScore / count) : 50;

    // Determine Dominant Theme
    let dominantTheme: WellnessProfile["dominantTheme"] = "balanced";
    const emotional = signals.get("emotional")?.score || 50;
    const recovery = signals.get("recovery")?.score || 100; // default high if not recovering

    if (overallWellnessScore >= 80) {
      dominantTheme = "thriving";
    } else if (recovery < 60) {
      dominantTheme = "recovering";
    } else if (emotional < 40) {
      dominantTheme = "stressed";
    } else if (overallWellnessScore < 50) {
      dominantTheme = "fatigued";
    }

    // Generate Narrative
    let narrative = "";
    switch (dominantTheme) {
      case "thriving":
        narrative = "You are currently thriving. Your holistic wellness indicators reflect a strong balance of physical and emotional health.";
        break;
      case "balanced":
        narrative = "Your overall wellness is balanced. You're maintaining a steady state, providing a good foundation for everyday life.";
        break;
      case "recovering":
        narrative = "Your body is currently in a state of active recovery. It's important to prioritize rest and be gentle with yourself right now.";
        break;
      case "stressed":
        narrative = "High stress levels are impacting your overall wellness. Consider integrating small moments of calm or mindfulness into your routine.";
        break;
      case "fatigued":
        narrative = "Your wellness indicators suggest you might be feeling fatigued. Focus on restorative practices like quality sleep and gentle nutrition.";
        break;
    }

    return {
      overallWellnessScore,
      dominantTheme,
      strengths,
      areasForGrowth,
      narrative,
    };
  }, []);

  return { fuse };
}
