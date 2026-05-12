/**
 * EnvironmentalHealthContext — Incorporates environmental factors
 * (weather, air quality, seasonal patterns) into health intelligence.
 */
import { useCallback } from "react";

export interface EnvironmentalContext {
  season: "spring" | "summer" | "autumn" | "winter";
  timeZone: string;
  estimatedUVIndex: "low" | "moderate" | "high" | "very_high";
  allergenSeason: boolean;
  dayLightHours: "short" | "moderate" | "long";
  healthImplications: EnvironmentalHealthImplication[];
}

export interface EnvironmentalHealthImplication {
  factor: string;
  domain: string;
  impact: "positive" | "neutral" | "negative";
  description: string;
  recommendation: string | null;
}

export function useEnvironmentalHealthContext() {
  const assessEnvironment = useCallback((): EnvironmentalContext => {
    const now = new Date();
    const month = now.getMonth();
    const season = month < 2 || month === 11 ? "winter" as const : month < 5 ? "spring" as const : month < 8 ? "summer" as const : "autumn" as const;
    const hour = now.getHours();
    const dayLight = season === "summer" ? "long" as const : season === "winter" ? "short" as const : "moderate" as const;
    const allergenSeason = season === "spring" || season === "autumn";
    const implications: EnvironmentalHealthImplication[] = [];
    if (season === "winter") implications.push({ factor: "Reduced daylight", domain: "emotional", impact: "negative", description: "Shorter days may affect mood and energy levels", recommendation: "Consider light therapy or outdoor time during daylight hours" });
    if (allergenSeason) implications.push({ factor: "Allergen season", domain: "respiratory", impact: "negative", description: "Seasonal allergens may trigger or worsen respiratory symptoms", recommendation: "Monitor for increased respiratory symptoms and consider preventive measures" });
    if (season === "summer") implications.push({ factor: "Heat exposure", domain: "activity", impact: "neutral", description: "Higher temperatures may affect exercise tolerance", recommendation: "Stay hydrated and exercise during cooler parts of the day" });
    return { season, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, estimatedUVIndex: season === "summer" ? "high" : season === "winter" ? "low" : "moderate", allergenSeason, dayLightHours: dayLight, healthImplications: implications };
  }, []);

  return { assessEnvironment };
}
