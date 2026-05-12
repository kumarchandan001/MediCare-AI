/**
 * Clinical Governance Module — Phase 5 Barrel Exports
 * Clinical Governance, Medical Accountability & Production Trust Infrastructure
 */

// ── Core Orchestration (Batch 1) ─────────
export { default as GovernanceStateProvider, useGovernance } from "./GovernanceStateProvider";
export { useClinicalGovernanceEngine } from "./ClinicalGovernanceEngine";
export { useMedicalAccountability } from "./MedicalAccountabilityLayer";
export { useTrustInfrastructure } from "./TrustInfrastructureManager";
export { useGovernanceOrchestrator } from "./GovernanceOrchestrator";

// ── Safety Guards (Batch 2) ──────────────
export { CONFIDENCE_THRESHOLDS, ESCALATION_THRESHOLDS, REASONING_THRESHOLDS, WEARABLE_THRESHOLDS, EMOTIONAL_THRESHOLDS, AUDIT_THRESHOLDS, RECOVERY_THRESHOLDS } from "./guards/ClinicalSafetyThresholds";
export { useGovernanceReasoningGuard } from "./guards/GovernanceReasoningGuard";
export { useUnsafeReasoningBlocker } from "./guards/UnsafeReasoningBlocker";
export { useClinicalSafetyModerator } from "./guards/ClinicalSafetyModerator";

// ── Audit Trail (Batch 3) ────────────────
export { useClinicalAuditTrail } from "./audit/ClinicalAuditTrailEngine";
export { useInvestigationAuditManager } from "./audit/InvestigationAuditManager";
export { useDecisionTraceRecorder } from "./audit/DecisionTraceRecorder";
export { useEscalationHistoryArchive } from "./audit/EscalationHistoryArchive";
export { useLongitudinalAuditMemory } from "./audit/LongitudinalAuditMemory";

// ── Decision Traceability (Batch 4) ──────
export { useReasoningLineageTracker } from "./traceability/ReasoningLineageTracker";
export { useHypothesisEvolutionHistory } from "./traceability/HypothesisEvolutionHistory";
export { default as ConfidenceEvolutionGraph } from "./traceability/ConfidenceEvolutionGraph";
export { default as EscalationDecisionPath } from "./traceability/EscalationDecisionPath";

// ── Governance Memory (Batch 5) ──────────
export { useGovernanceMemory } from "./memory/GovernanceMemoryLayer";
export { useLongitudinalDecisionArchive } from "./memory/LongitudinalDecisionArchive";
export { useHistoricalConsistencyPreserver } from "./memory/HistoricalConsistencyPreserver";

// ── Failure Resilience (Batch 6) ─────────
export { useInvestigationRecovery } from "./resilience/InvestigationRecoveryManager";
export { default as SessionContinuityRecovery } from "./resilience/SessionContinuityRecovery";
export { useWearableFallback } from "./resilience/WearableFallbackManager";
export { useOperationalCalmness } from "./resilience/OperationalCalmnessGuard";

// ── Observability (Batch 7) ──────────────
export { useHealthIntelligenceObservability } from "./observability/HealthIntelligenceObservability";
export { useInvestigationHealthMetrics } from "./observability/InvestigationHealthMetrics";
export { default as LongitudinalConsistencyDashboard } from "./observability/LongitudinalConsistencyDashboard";

// ── Trust UI Components (Batch 8) ────────
export { default as TransparencyCompliancePanel } from "./components/TransparencyCompliancePanel";
export { default as InvestigationTransparencyViewer } from "./components/InvestigationTransparencyViewer";
export { default as TrustExperienceLayer } from "./components/TrustExperienceLayer";
export { default as HealthDataResponsibilityPanel } from "./components/HealthDataResponsibilityPanel";
export { default as InvestigationTrustSignals } from "./components/InvestigationTrustSignals";

// ── Testing (Batch 9) ───────────────────
export { GOVERNANCE_SCENARIOS, runScenario } from "./testing/GovernanceScenarioRunner";
export { runComplianceStressTests } from "./testing/ComplianceStressTester";

// ── Types ────────────────────────────────
export type { TrustSignal, TrustHealthReport } from "./TrustInfrastructureManager";
export type { GuardVerdict, GuardCheck } from "./guards/GovernanceReasoningGuard";
export type { DetailedAuditEntry, AuditQuery, AuditSummary } from "./audit/ClinicalAuditTrailEngine";
export type { DecisionTrace, DecisionLineage } from "./audit/DecisionTraceRecorder";
export type { ArchivedEscalation, EscalationPattern, EscalationAnalysis } from "./audit/EscalationHistoryArchive";
export type { ReasoningLineage, LineageNode } from "./traceability/ReasoningLineageTracker";
export type { HypothesisSnapshot, HypothesisChange, EvolutionTimeline } from "./traceability/HypothesisEvolutionHistory";
export type { RecoveryCheckpoint, RecoveryOffer } from "./resilience/InvestigationRecoveryManager";
export type { ObservabilityMetrics } from "./observability/HealthIntelligenceObservability";
export type { InvestigationMetrics, MetricsTrend } from "./observability/InvestigationHealthMetrics";
