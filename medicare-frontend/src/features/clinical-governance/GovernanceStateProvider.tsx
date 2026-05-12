/**
 * GovernanceStateProvider — Central governance state context for Phase 5.
 * Tracks audit trail, safety records, escalation history, compliance flags,
 * session recovery, and privacy consent across the entire application.
 * Persists to localStorage for cross-session governance memory.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

// ── Audit Entry ──────────────────────────
export interface AuditEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  category: "investigation" | "escalation" | "safety" | "wearable" | "monitoring" | "recovery" | "privacy";
  action: string;
  detail: string;
  impact: "low" | "medium" | "high" | "critical";
  outcome: "passed" | "moderated" | "blocked" | "recovered" | "logged";
  relatedCondition?: string;
  metadata?: Record<string, unknown>;
}

// ── Safety Violation ─────────────────────
export interface SafetyViolation {
  id: string;
  timestamp: number;
  type: "unsafe_reasoning" | "overconfident" | "unsafe_escalation" | "emotional_harm" | "privacy_breach" | "unsafe_recommendation";
  description: string;
  severity: "warning" | "violation" | "critical";
  wasBlocked: boolean;
  remediation: string;
}

// ── Escalation Record ────────────────────
export interface EscalationRecord {
  id: string;
  timestamp: number;
  sessionId: string;
  proposedLevel: string;
  finalLevel: string;
  wasModerated: boolean;
  reason: string;
  triggerSymptoms: string[];
  governanceApproved: boolean;
}

// ── Compliance Status ────────────────────
export interface ComplianceStatus {
  auditTrailIntact: boolean;
  safetyGuardsActive: boolean;
  privacyConsentGiven: boolean;
  lastAuditTimestamp: number;
  totalInvestigationsAudited: number;
  violationsBlocked: number;
  escalationsModerated: number;
}

// ── Recovery State ───────────────────────
export interface RecoveryState {
  hasIncompleteInvestigation: boolean;
  savedPhase: string | null;
  savedSymptoms: string[];
  savedConversation: unknown[];
  savedTimestamp: number | null;
  recoveryOffered: boolean;
}

// ── Privacy Consent ──────────────────────
export interface PrivacyConsent {
  localStorageConsent: boolean;
  wearableDataConsent: boolean;
  monitoringConsent: boolean;
  auditTrailConsent: boolean;
  lastUpdated: number;
}

// ── Trust Score ──────────────────────────
export interface TrustScore {
  overall: number;        // 0-100
  reasoningStability: number;
  auditCompleteness: number;
  safetyRecord: number;
  recoverySuccess: number;
  grade: "excellent" | "good" | "fair" | "needs_attention";
}

// ── Context Value ────────────────────────
export interface GovernanceContextValue {
  // Audit trail
  auditTrail: AuditEntry[];
  addAuditEntry: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
  getAuditBySession: (sessionId: string) => AuditEntry[];
  getAuditByCategory: (category: AuditEntry["category"]) => AuditEntry[];

  // Safety
  safetyViolations: SafetyViolation[];
  addSafetyViolation: (v: Omit<SafetyViolation, "id" | "timestamp">) => void;

  // Escalation history
  escalationHistory: EscalationRecord[];
  addEscalationRecord: (r: Omit<EscalationRecord, "id" | "timestamp">) => void;

  // Compliance
  complianceStatus: ComplianceStatus;
  updateCompliance: (update: Partial<ComplianceStatus>) => void;

  // Recovery
  recoveryState: RecoveryState;
  saveRecoveryCheckpoint: (data: Partial<RecoveryState>) => void;
  clearRecovery: () => void;

  // Privacy
  privacyConsent: PrivacyConsent;
  updatePrivacyConsent: (update: Partial<PrivacyConsent>) => void;

  // Trust
  trustScore: TrustScore;

  // Governance verdict from last pass
  lastVerdict: GovernanceVerdict | null;
  setLastVerdict: (v: GovernanceVerdict) => void;
}

export interface GovernanceVerdict {
  isAccountable: boolean;
  isSafe: boolean;
  auditEntryId: string;
  safetyFlags: string[];
  complianceOk: boolean;
  trustDelta: number;        // +/- change to trust score
  moderationApplied: string[];
  timestamp: number;
}

const STORAGE_KEY = "medicare_governance_state";

const defaultCompliance: ComplianceStatus = {
  auditTrailIntact: true,
  safetyGuardsActive: true,
  privacyConsentGiven: false,
  lastAuditTimestamp: 0,
  totalInvestigationsAudited: 0,
  violationsBlocked: 0,
  escalationsModerated: 0,
};

const defaultRecovery: RecoveryState = {
  hasIncompleteInvestigation: false,
  savedPhase: null,
  savedSymptoms: [],
  savedConversation: [],
  savedTimestamp: null,
  recoveryOffered: false,
};

const defaultConsent: PrivacyConsent = {
  localStorageConsent: true,  // Default true for app functionality
  wearableDataConsent: false,
  monitoringConsent: false,
  auditTrailConsent: true,
  lastUpdated: Date.now(),
};

function computeTrustScore(
  audit: AuditEntry[],
  violations: SafetyViolation[],
  compliance: ComplianceStatus
): TrustScore {
  // Reasoning stability: fewer violations = higher
  const blockedCount = violations.filter(v => v.wasBlocked).length;
  const totalViolations = violations.length;
  const reasoningStability = totalViolations === 0 ? 100 : Math.max(0, 100 - totalViolations * 8 + blockedCount * 3);

  // Audit completeness: based on having recent audits
  const recentAudits = audit.filter(a => Date.now() - a.timestamp < 86_400_000).length;
  const auditCompleteness = Math.min(100, recentAudits * 10 + (compliance.auditTrailIntact ? 40 : 0));

  // Safety record: based on violation severity
  const criticalViolations = violations.filter(v => v.severity === "critical").length;
  const safetyRecord = criticalViolations === 0 ? 95 : Math.max(0, 95 - criticalViolations * 25);

  // Recovery success: based on compliance data
  const recoverySuccess = compliance.safetyGuardsActive ? 90 : 50;

  const overall = Math.round((reasoningStability + auditCompleteness + safetyRecord + recoverySuccess) / 4);

  let grade: TrustScore["grade"];
  if (overall >= 85) grade = "excellent";
  else if (overall >= 70) grade = "good";
  else if (overall >= 50) grade = "fair";
  else grade = "needs_attention";

  return { overall, reasoningStability, auditCompleteness, safetyRecord, recoverySuccess, grade };
}

function loadState(): { audit: AuditEntry[]; violations: SafetyViolation[]; escalations: EscalationRecord[]; compliance: ComplianceStatus; consent: PrivacyConsent } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        audit: parsed.audit || [],
        violations: parsed.violations || [],
        escalations: parsed.escalations || [],
        compliance: { ...defaultCompliance, ...parsed.compliance },
        consent: { ...defaultConsent, ...parsed.consent },
      };
    }
  } catch { /* ignore */ }
  return { audit: [], violations: [], escalations: [], compliance: defaultCompliance, consent: defaultConsent };
}

const GovernanceContext = createContext<GovernanceContextValue | null>(null);

export function useGovernance() {
  const ctx = useContext(GovernanceContext);
  if (!ctx) throw new Error("useGovernance must be used inside GovernanceStateProvider");
  return ctx;
}

export default function GovernanceStateProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => loadState(), []);

  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>(initial.audit);
  const [safetyViolations, setSafetyViolations] = useState<SafetyViolation[]>(initial.violations);
  const [escalationHistory, setEscalationHistory] = useState<EscalationRecord[]>(initial.escalations);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>(initial.compliance);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>(defaultRecovery);
  const [privacyConsent, setPrivacyConsent] = useState<PrivacyConsent>(initial.consent);
  const [lastVerdict, setLastVerdict] = useState<GovernanceVerdict | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      const data = {
        audit: auditTrail.slice(-500),  // Keep last 500
        violations: safetyViolations.slice(-200),
        escalations: escalationHistory.slice(-200),
        compliance: complianceStatus,
        consent: privacyConsent,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* storage full — degrade gracefully */ }
  }, [auditTrail, safetyViolations, escalationHistory, complianceStatus, privacyConsent]);

  const addAuditEntry = useCallback((entry: Omit<AuditEntry, "id" | "timestamp">) => {
    const full: AuditEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setAuditTrail(prev => [...prev, full]);
    setComplianceStatus(prev => ({ ...prev, lastAuditTimestamp: Date.now(), totalInvestigationsAudited: prev.totalInvestigationsAudited + (entry.category === "investigation" ? 1 : 0) }));
  }, []);

  const getAuditBySession = useCallback((sessionId: string) => auditTrail.filter(a => a.sessionId === sessionId), [auditTrail]);
  const getAuditByCategory = useCallback((category: AuditEntry["category"]) => auditTrail.filter(a => a.category === category), [auditTrail]);

  const addSafetyViolation = useCallback((v: Omit<SafetyViolation, "id" | "timestamp">) => {
    setSafetyViolations(prev => [...prev, { ...v, id: `vio-${Date.now()}`, timestamp: Date.now() }]);
    if (v.wasBlocked) setComplianceStatus(prev => ({ ...prev, violationsBlocked: prev.violationsBlocked + 1 }));
  }, []);

  const addEscalationRecord = useCallback((r: Omit<EscalationRecord, "id" | "timestamp">) => {
    setEscalationHistory(prev => [...prev, { ...r, id: `esc-${Date.now()}`, timestamp: Date.now() }]);
    if (r.wasModerated) setComplianceStatus(prev => ({ ...prev, escalationsModerated: prev.escalationsModerated + 1 }));
  }, []);

  const updateCompliance = useCallback((update: Partial<ComplianceStatus>) => {
    setComplianceStatus(prev => ({ ...prev, ...update }));
  }, []);

  const saveRecoveryCheckpoint = useCallback((data: Partial<RecoveryState>) => {
    setRecoveryState(prev => ({ ...prev, ...data, savedTimestamp: Date.now() }));
  }, []);

  const clearRecovery = useCallback(() => setRecoveryState(defaultRecovery), []);

  const updatePrivacyConsent = useCallback((update: Partial<PrivacyConsent>) => {
    setPrivacyConsent(prev => ({ ...prev, ...update, lastUpdated: Date.now() }));
  }, []);

  const trustScore = useMemo(() => computeTrustScore(auditTrail, safetyViolations, complianceStatus), [auditTrail, safetyViolations, complianceStatus]);

  const value = useMemo<GovernanceContextValue>(() => ({
    auditTrail, addAuditEntry, getAuditBySession, getAuditByCategory,
    safetyViolations, addSafetyViolation,
    escalationHistory, addEscalationRecord,
    complianceStatus, updateCompliance,
    recoveryState, saveRecoveryCheckpoint, clearRecovery,
    privacyConsent, updatePrivacyConsent,
    trustScore,
    lastVerdict, setLastVerdict,
  }), [
    auditTrail, addAuditEntry, getAuditBySession, getAuditByCategory,
    safetyViolations, addSafetyViolation,
    escalationHistory, addEscalationRecord,
    complianceStatus, updateCompliance,
    recoveryState, saveRecoveryCheckpoint, clearRecovery,
    privacyConsent, updatePrivacyConsent,
    trustScore, lastVerdict,
  ]);

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
}
