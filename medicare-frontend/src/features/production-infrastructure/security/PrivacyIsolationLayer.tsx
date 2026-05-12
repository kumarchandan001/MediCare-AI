/**
 * PrivacyIsolationLayer — Enforces data isolation boundaries, PII
 * protection, consent-aware data access, and privacy compliance checks.
 */
import { useCallback } from "react";

export interface PrivacyClassification {
  field: string;
  classification: "public" | "internal" | "confidential" | "restricted" | "pii";
  requiresConsent: boolean;
  encryptionRequired: boolean;
  retentionDays: number;
  allowedContexts: string[];
}

export interface PrivacyAuditEntry {
  id: string;
  action: "access" | "modify" | "delete" | "export" | "share";
  dataClassification: PrivacyClassification["classification"];
  userId: string;
  timestamp: number;
  consentVerified: boolean;
  context: string;
  allowed: boolean;
  reason: string;
}

export interface ConsentRecord {
  userId: string;
  dataCategory: string;
  granted: boolean;
  grantedAt: number | null;
  expiresAt: number | null;
  scope: string[];
}

export function usePrivacyIsolationLayer() {
  const checkAccess = useCallback((
    classification: PrivacyClassification, consent: ConsentRecord | null, context: string
  ): { allowed: boolean; reason: string } => {
    if (classification.requiresConsent && (!consent || !consent.granted)) {
      return { allowed: false, reason: `Consent required for ${classification.classification} data "${classification.field}"` };
    }
    if (consent?.expiresAt && Date.now() > consent.expiresAt) {
      return { allowed: false, reason: "Consent has expired — re-authorization required" };
    }
    if (!classification.allowedContexts.includes(context) && classification.allowedContexts.length > 0) {
      return { allowed: false, reason: `Context "${context}" not allowed for ${classification.field}` };
    }
    return { allowed: true, reason: "Access granted" };
  }, []);

  const classifyHealthData = useCallback((fieldName: string): PrivacyClassification => {
    const piiFields = ["name", "email", "phone", "address", "ssn", "dob", "date_of_birth"];
    const restrictedFields = ["diagnosis", "medication", "treatment", "genetic", "mental_health"];
    const confidentialFields = ["symptoms", "vitals", "wearable_data", "sleep_data"];
    const isPII = piiFields.some(f => fieldName.toLowerCase().includes(f));
    const isRestricted = restrictedFields.some(f => fieldName.toLowerCase().includes(f));
    const isConfidential = confidentialFields.some(f => fieldName.toLowerCase().includes(f));
    let classification: PrivacyClassification["classification"] = "internal";
    if (isPII) classification = "pii";
    else if (isRestricted) classification = "restricted";
    else if (isConfidential) classification = "confidential";
    return {
      field: fieldName, classification,
      requiresConsent: isPII || isRestricted,
      encryptionRequired: isPII || isRestricted || isConfidential,
      retentionDays: isPII ? 365 : isRestricted ? 730 : 1825,
      allowedContexts: isPII ? ["user_profile", "clinical"] : [],
    };
  }, []);

  const generateAuditEntry = useCallback((
    action: PrivacyAuditEntry["action"], classification: PrivacyClassification["classification"],
    userId: string, context: string, allowed: boolean, reason: string
  ): PrivacyAuditEntry => ({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action, dataClassification: classification, userId, timestamp: Date.now(),
    consentVerified: allowed, context, allowed, reason,
  }), []);

  return { checkAccess, classifyHealthData, generateAuditEntry };
}
