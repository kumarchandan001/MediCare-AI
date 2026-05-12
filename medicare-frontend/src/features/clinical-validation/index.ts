/**
 * clinical-validation — Phase 7 Barrel Index
 * 
 * Exports all clinical validation, benchmarking, trust, observability,
 * dataset, and oversight modules for the MediCare AI platform.
 */

// ── Engine ───────────────────────────────
export { useClinicalValidationEngine } from "./engine/ClinicalValidationEngine";
export type { ValidationSuiteResults } from "./engine/ClinicalValidationEngine";
export { useClinicalConsistencyScorer } from "./engine/ClinicalConsistencyScorer";

// ── Benchmarks ───────────────────────────
export { createBenchmarkSuite } from "./benchmarks/ReasoningBenchmarkFramework";
export type { BenchmarkScenario, BenchmarkResult } from "./benchmarks/ReasoningBenchmarkFramework";
export { temporalReasoningSuite } from "./benchmarks/TemporalReasoningBenchmarks";
export { contradictionHandlingSuite } from "./benchmarks/ContradictionHandlingBenchmarks";
export { sparseEvidenceSuite } from "./benchmarks/SparseEvidenceBenchmarking";
export { escalationSuite } from "./benchmarks/EscalationEvaluationSuite";

// ── Evaluation ───────────────────────────
export { useLongitudinalReasoningEvaluator } from "./evaluation/LongitudinalReasoningEvaluator";
export { useInvestigationStabilityScorer } from "./evaluation/InvestigationStabilityScorer";
export { useRecoveryConsistencyMetrics } from "./evaluation/RecoveryConsistencyMetrics";
export { useProgressionBelievabilityAnalyzer } from "./evaluation/ProgressionBelievabilityAnalyzer";

// ── Longitudinal ─────────────────────────
export { useLongitudinalValidationManager } from "./longitudinal/LongitudinalValidationManager";
export { useValidationResearchCoordinator } from "./longitudinal/ValidationResearchCoordinator";

// ── Trust ────────────────────────────────
export { useTrustFeedbackFramework } from "./trust/TrustFeedbackFramework";
export { useUserConfidenceTracking } from "./trust/UserConfidenceTracking";
export { useEscalationPerceptionTesting } from "./trust/EscalationPerceptionTesting";
export { useEmotionalSafetyEvaluation } from "./trust/EmotionalSafetyEvaluation";
export { useTrustEvolutionEngine } from "./trust/TrustEvolutionEngine";
export { useClinicalBelievabilityMetrics } from "./trust/ClinicalBelievabilityMetrics";
export { useTransparencyEffectivenessAnalyzer } from "./trust/TransparencyEffectivenessAnalyzer";
export { useGovernanceConfidenceTracker } from "./trust/GovernanceConfidenceTracker";

// ── Datasets ─────────────────────────────
export { useTemporalDatasetManager } from "./datasets/TemporalDatasetManager";
export { useWearableDatasetFusion } from "./datasets/WearableDatasetFusion";
export { useLongitudinalEvidencePipeline } from "./datasets/LongitudinalEvidencePipeline";
export { useScenarioDatasetGenerator } from "./datasets/ScenarioDatasetGenerator";

// ── Oversight ────────────────────────────
export { useMedicalOversightReadiness } from "./oversight/MedicalOversightReadiness";
export { createOversightExtension, defaultExtensionPoints } from "./oversight/OversightExtensionPoints";
