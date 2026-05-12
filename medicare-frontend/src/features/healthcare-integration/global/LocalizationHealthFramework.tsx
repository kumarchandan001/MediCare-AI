/**
 * LocalizationHealthFramework — Adapts health content, units,
 * reference ranges, and clinical guidelines to regional standards.
 */
import { useCallback } from "react";

export interface RegionalHealthConfig {
  region: string;
  unitSystem: "metric" | "imperial" | "mixed";
  temperatureUnit: "celsius" | "fahrenheit";
  bloodGlucoseUnit: "mmol_L" | "mg_dL";
  weightUnit: "kg" | "lbs";
  referenceRanges: { metric: string; min: number; max: number; unit: string }[];
  guidelineSource: string;
}

export function useLocalizationHealthFramework() {
  const getRegionalConfig = useCallback((region: string): RegionalHealthConfig => {
    const configs: Record<string, Partial<RegionalHealthConfig>> = {
      "US": { unitSystem: "imperial", temperatureUnit: "fahrenheit", bloodGlucoseUnit: "mg_dL", weightUnit: "lbs", guidelineSource: "CDC/AMA" },
      "UK": { unitSystem: "mixed", temperatureUnit: "celsius", bloodGlucoseUnit: "mmol_L", weightUnit: "kg", guidelineSource: "NICE/NHS" },
      "EU": { unitSystem: "metric", temperatureUnit: "celsius", bloodGlucoseUnit: "mmol_L", weightUnit: "kg", guidelineSource: "WHO/EMA" },
      "IN": { unitSystem: "metric", temperatureUnit: "celsius", bloodGlucoseUnit: "mg_dL", weightUnit: "kg", guidelineSource: "ICMR/WHO" },
    };
    const config = configs[region] || configs["US"];
    return { region, unitSystem: "metric", temperatureUnit: "celsius", bloodGlucoseUnit: "mmol_L", weightUnit: "kg", referenceRanges: [], guidelineSource: "WHO", ...config };
  }, []);

  return { getRegionalConfig };
}
