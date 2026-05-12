/**
 * InteroperabilityFramework — Manages healthcare data interoperability
 * with FHIR, HL7, and custom protocol support for extensible integration.
 */
import { useCallback } from "react";

export interface FHIRResource {
  resourceType: string;
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: string;
  data: Record<string, unknown>;
}

export interface InteroperabilityCapability {
  standard: string;
  operations: ("read" | "create" | "update" | "search" | "batch")[];
  resourceTypes: string[];
  readiness: number;
  limitations: string[];
}

export function useInteroperabilityFramework() {
  const getCapabilities = useCallback((): InteroperabilityCapability[] => [
    { standard: "FHIR R4", operations: ["read", "search"], resourceTypes: ["Patient", "Observation", "Condition", "MedicationStatement", "DiagnosticReport"], readiness: 55, limitations: ["Write operations not yet supported", "Batch operations in development"] },
    { standard: "HL7 v2", operations: ["read"], resourceTypes: ["ADT", "ORM", "ORU"], readiness: 25, limitations: ["Parse-only support", "Message generation pending"] },
    { standard: "CDA R2", operations: ["read"], resourceTypes: ["ContinuityOfCareDocument"], readiness: 20, limitations: ["Read-only CCD parsing", "Section extraction only"] },
  ], []);

  const mapToFHIR = useCallback((internalData: Record<string, unknown>, resourceType: string): FHIRResource => ({
    resourceType, id: `medicare-${Date.now()}`,
    meta: { versionId: "1", lastUpdated: new Date().toISOString() },
    status: "active", data: { ...internalData, _source: "MediCare AI", _disclaimer: "AI-generated — requires clinical validation" },
  }), []);

  const validateFHIRResource = useCallback((resource: FHIRResource): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!resource.resourceType) errors.push("Missing resourceType");
    if (!resource.id) errors.push("Missing resource ID");
    if (!resource.meta?.lastUpdated) errors.push("Missing meta.lastUpdated");
    return { valid: errors.length === 0, errors };
  }, []);

  return { getCapabilities, mapToFHIR, validateFHIRResource };
}
