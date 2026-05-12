/**
 * EcosystemIsolationManager — Enforces strict data and compute isolation
 * between organizations, tenants, and user contexts.
 */
import { useCallback } from "react";

export interface IsolationBoundary {
  id: string;
  type: "tenant" | "organization" | "department" | "user" | "research_cohort";
  parentBoundary: string | null;
  isolationLevel: "full" | "shared_compute" | "shared_anonymized" | "federated";
  dataClassification: "public" | "internal" | "confidential" | "restricted" | "phi";
  accessControl: { principals: string[]; permissions: string[] }[];
}

export interface IsolationViolation {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  boundary: string;
  timestamp: number;
  remediation: string;
}

export function useEcosystemIsolationManager() {
  const validateIsolation = useCallback((boundaries: IsolationBoundary[]): IsolationViolation[] => {
    const violations: IsolationViolation[] = [];
    boundaries.forEach(b => {
      if (b.dataClassification === "phi" && b.isolationLevel !== "full") {
        violations.push({ type: "insufficient_isolation", severity: "critical", description: `PHI data in boundary "${b.id}" requires full isolation`, boundary: b.id, timestamp: Date.now(), remediation: "Upgrade isolation level to 'full' for PHI data" });
      }
      if (b.accessControl.length === 0) {
        violations.push({ type: "missing_acl", severity: "high", description: `Boundary "${b.id}" has no access control`, boundary: b.id, timestamp: Date.now(), remediation: "Define access control principals and permissions" });
      }
    });
    return violations;
  }, []);

  const createBoundary = useCallback((type: IsolationBoundary["type"], classification: IsolationBoundary["dataClassification"]): IsolationBoundary => ({
    id: `boundary-${Date.now()}`, type, parentBoundary: null,
    isolationLevel: classification === "phi" || classification === "restricted" ? "full" : "shared_compute",
    dataClassification: classification, accessControl: [],
  }), []);

  return { validateIsolation, createBoundary };
}
