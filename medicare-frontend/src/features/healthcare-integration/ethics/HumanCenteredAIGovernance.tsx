/**
 * HumanCenteredAIGovernance — Governance framework ensuring AI remains
 * a tool that serves human health, never the other way around.
 */
import { useCallback } from "react";

export interface AIGovernanceRule {
  id: string;
  rule: string;
  category: "autonomy" | "safety" | "transparency" | "accountability";
  enforcement: "automated" | "manual_review" | "audit";
  active: boolean;
}

export function useHumanCenteredAIGovernance() {
  const getRules = useCallback((): AIGovernanceRule[] => [
    { id: "hcg-1", rule: "AI must never override user health decisions", category: "autonomy", enforcement: "automated", active: true },
    { id: "hcg-2", rule: "AI must disclose uncertainty in all predictions", category: "transparency", enforcement: "automated", active: true },
    { id: "hcg-3", rule: "AI must escalate high-severity findings to human attention", category: "safety", enforcement: "automated", active: true },
    { id: "hcg-4", rule: "AI must never create dependency or discourage professional care", category: "safety", enforcement: "manual_review", active: true },
    { id: "hcg-5", rule: "All AI decisions must be traceable and auditable", category: "accountability", enforcement: "automated", active: true },
    { id: "hcg-6", rule: "AI must respect user silence and not over-notify", category: "autonomy", enforcement: "automated", active: true },
    { id: "hcg-7", rule: "AI must never use health data for non-health purposes", category: "accountability", enforcement: "audit", active: true },
  ], []);

  const validateCompliance = useCallback((rules: AIGovernanceRule[]): { compliant: boolean; activeRules: number; score: number } => {
    const active = rules.filter(r => r.active);
    return { compliant: active.length === rules.length, activeRules: active.length, score: Math.round((active.length / rules.length) * 100) };
  }, []);

  return { getRules, validateCompliance };
}
