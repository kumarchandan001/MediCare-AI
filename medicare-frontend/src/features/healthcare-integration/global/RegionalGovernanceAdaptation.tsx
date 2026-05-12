/**
 * RegionalGovernanceAdaptation — Adapts governance policies to
 * regional regulatory requirements (GDPR, HIPAA, PIPEDA, etc.).
 */
import { useCallback } from "react";

export interface RegionalRegulation {
  region: string;
  framework: string;
  dataResidency: "local_required" | "regional_ok" | "global_ok";
  consentModel: "opt_in" | "opt_out" | "explicit_consent";
  rightToErasure: boolean;
  dataPortability: boolean;
  breachNotification: { required: boolean; timeframeHours: number };
  aiTransparency: "required" | "recommended" | "not_specified";
}

export function useRegionalGovernanceAdaptation() {
  const getRegulations = useCallback((): RegionalRegulation[] => [
    { region: "EU", framework: "GDPR", dataResidency: "regional_ok", consentModel: "explicit_consent", rightToErasure: true, dataPortability: true, breachNotification: { required: true, timeframeHours: 72 }, aiTransparency: "required" },
    { region: "US", framework: "HIPAA", dataResidency: "local_required", consentModel: "opt_in", rightToErasure: false, dataPortability: true, breachNotification: { required: true, timeframeHours: 1440 }, aiTransparency: "recommended" },
    { region: "Canada", framework: "PIPEDA", dataResidency: "regional_ok", consentModel: "opt_in", rightToErasure: true, dataPortability: false, breachNotification: { required: true, timeframeHours: 72 }, aiTransparency: "recommended" },
    { region: "India", framework: "DPDPA", dataResidency: "local_required", consentModel: "explicit_consent", rightToErasure: true, dataPortability: true, breachNotification: { required: true, timeframeHours: 72 }, aiTransparency: "recommended" },
  ], []);

  const assessCompliance = useCallback((region: string, regulations: RegionalRegulation[]): { compliant: boolean; gaps: string[] } => {
    const reg = regulations.find(r => r.region === region);
    if (!reg) return { compliant: false, gaps: ["Region not supported"] };
    const gaps: string[] = [];
    if (reg.dataResidency === "local_required") gaps.push("Local data residency deployment required");
    if (reg.rightToErasure) gaps.push("Right to erasure workflow needs verification");
    if (reg.aiTransparency === "required") gaps.push("AI transparency disclosures must be validated");
    return { compliant: gaps.length === 0, gaps };
  }, []);

  return { getRegulations, assessCompliance };
}
