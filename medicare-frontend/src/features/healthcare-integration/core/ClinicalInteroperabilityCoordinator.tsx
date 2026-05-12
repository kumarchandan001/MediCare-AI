/**
 * ClinicalInteroperabilityCoordinator — Coordinates data transformation
 * and mapping between internal health models and standard clinical formats.
 */
import { useCallback } from "react";

export interface DataMapping {
  sourceField: string;
  targetField: string;
  sourceFormat: string;
  targetFormat: string;
  transformation: "direct" | "coded" | "computed" | "aggregated";
  lossless: boolean;
}

export interface InteroperabilityReport {
  standard: string;
  complianceLevel: "none" | "partial" | "substantial" | "full";
  mappedFields: number;
  unmappedFields: number;
  dataLossRisk: "none" | "minimal" | "moderate" | "significant";
  gaps: string[];
}

export function useClinicalInteroperabilityCoordinator() {
  const assessCompliance = useCallback((standard: string, mappings: DataMapping[]): InteroperabilityReport => {
    const unmapped = mappings.filter(m => m.transformation === "direct" && !m.lossless);
    const lossyCount = mappings.filter(m => !m.lossless).length;
    let complianceLevel: InteroperabilityReport["complianceLevel"] = "full";
    if (unmapped.length > mappings.length * 0.3) complianceLevel = "partial";
    else if (unmapped.length > mappings.length * 0.1) complianceLevel = "substantial";
    else if (unmapped.length > 0) complianceLevel = "substantial";
    if (mappings.length === 0) complianceLevel = "none";
    return {
      standard, complianceLevel, mappedFields: mappings.length - unmapped.length,
      unmappedFields: unmapped.length,
      dataLossRisk: lossyCount === 0 ? "none" : lossyCount < 3 ? "minimal" : lossyCount < 10 ? "moderate" : "significant",
      gaps: unmapped.map(m => `${m.sourceField} → ${m.targetField}: lossy ${m.transformation} mapping`),
    };
  }, []);

  const getSupportedStandards = useCallback((): { standard: string; version: string; readiness: number }[] => [
    { standard: "FHIR", version: "R4", readiness: 60 },
    { standard: "HL7", version: "v2.5", readiness: 30 },
    { standard: "CDA", version: "R2", readiness: 20 },
    { standard: "SNOMED CT", version: "2024", readiness: 45 },
    { standard: "ICD-10", version: "2024", readiness: 55 },
    { standard: "LOINC", version: "2.77", readiness: 40 },
  ], []);

  return { assessCompliance, getSupportedStandards };
}
