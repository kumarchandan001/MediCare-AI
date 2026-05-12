/**
 * HealthcareIntegrationEngine — Foundational engine for healthcare
 * ecosystem integration, managing connectivity state, protocol support,
 * and integration health across all external health system connections.
 */
import { useCallback, useRef } from "react";

export interface IntegrationEndpoint {
  id: string;
  name: string;
  protocol: "fhir_r4" | "hl7_v2" | "cda" | "dicom" | "custom_api" | "webhook";
  status: "connected" | "disconnected" | "degraded" | "pending_auth" | "not_configured";
  category: "ehr" | "lab" | "pharmacy" | "imaging" | "wearable" | "payer" | "telehealth";
  lastSync: number | null;
  errorCount: number;
  dataFlowDirection: "inbound" | "outbound" | "bidirectional";
}

export interface IntegrationHealth {
  totalEndpoints: number;
  connectedCount: number;
  healthScore: number;
  protocolCoverage: Record<string, number>;
  lastAssessment: number;
  recommendations: string[];
}

export function useHealthcareIntegrationEngine() {
  const endpoints = useRef<Map<string, IntegrationEndpoint>>(new Map());

  const registerEndpoint = useCallback((endpoint: IntegrationEndpoint): void => {
    endpoints.current.set(endpoint.id, endpoint);
  }, []);

  const assessHealth = useCallback((): IntegrationHealth => {
    const all = Array.from(endpoints.current.values());
    const connected = all.filter(e => e.status === "connected");
    const protocols: Record<string, number> = {};
    all.forEach(e => { protocols[e.protocol] = (protocols[e.protocol] || 0) + 1; });
    const recommendations: string[] = [];
    const degraded = all.filter(e => e.status === "degraded");
    if (degraded.length > 0) recommendations.push(`${degraded.length} endpoint(s) degraded — review connection health`);
    const highError = all.filter(e => e.errorCount > 10);
    if (highError.length > 0) recommendations.push(`${highError.length} endpoint(s) with elevated error rates`);
    if (!all.some(e => e.protocol === "fhir_r4")) recommendations.push("Consider adding FHIR R4 support for EHR interoperability");
    return {
      totalEndpoints: all.length, connectedCount: connected.length,
      healthScore: all.length > 0 ? Math.round((connected.length / all.length) * 100) : 0,
      protocolCoverage: protocols, lastAssessment: Date.now(), recommendations,
    };
  }, []);

  const getEndpoints = useCallback((category?: IntegrationEndpoint["category"]): IntegrationEndpoint[] => {
    const all = Array.from(endpoints.current.values());
    return category ? all.filter(e => e.category === category) : all;
  }, []);

  return { registerEndpoint, assessHealth, getEndpoints };
}
