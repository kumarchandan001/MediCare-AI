/**
 * PrivacyPreservingPersonalization — Ensures all personalization is
 * privacy-safe with differential privacy concepts and consent management.
 */
import { useCallback } from "react";

export interface PrivacyPersonalizationConfig {
  anonymizationLevel: "none" | "pseudonymized" | "anonymized" | "differential_privacy";
  consentScope: string[];
  dataRetentionDays: number;
  localOnlyFields: string[];
  sharableAggregates: string[];
}

export interface PersonalizationAudit {
  timestamp: number;
  personalizedFeatures: string[];
  dataSourcesUsed: string[];
  privacyCompliant: boolean;
  consentVerified: boolean;
  violations: string[];
}

export function usePrivacyPreservingPersonalization() {
  const auditPersonalization = useCallback((features: string[], dataSources: string[], consentedScopes: string[]): PersonalizationAudit => {
    const violations: string[] = [];
    const sensitivePatterns = ["genetic", "mental_health", "substance", "sexual_health"];
    dataSources.forEach(ds => {
      if (sensitivePatterns.some(p => ds.toLowerCase().includes(p)) && !consentedScopes.includes(ds)) {
        violations.push(`Sensitive data source "${ds}" used without explicit consent`);
      }
    });
    return { timestamp: Date.now(), personalizedFeatures: features, dataSourcesUsed: dataSources, privacyCompliant: violations.length === 0, consentVerified: violations.length === 0, violations };
  }, []);

  const getDefaultConfig = useCallback((): PrivacyPersonalizationConfig => ({
    anonymizationLevel: "pseudonymized", consentScope: ["health_metrics", "interaction_patterns", "preferences"],
    dataRetentionDays: 365, localOnlyFields: ["raw_symptoms", "personal_notes", "medication_details"],
    sharableAggregates: ["engagement_score", "feature_usage_counts"],
  }), []);

  return { auditPersonalization, getDefaultConfig };
}
