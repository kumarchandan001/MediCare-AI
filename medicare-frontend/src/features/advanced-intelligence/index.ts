/**
 * advanced-intelligence — Phase 9 Barrel Index
 *
 * Exports all advanced intelligence modules: predictive, multimodal,
 * personalized, federated, collaboration, research, companion, and ecosystem.
 */

// ── Predictive Intelligence ──────────────
export { usePredictiveHealthEngine } from "./predictive/PredictiveHealthEngine";
export type { HealthPrediction, PredictionEvidence, PreventiveAction } from "./predictive/PredictiveHealthEngine";
export { useEarlyDeteriorationForecasting } from "./predictive/EarlyDeteriorationForecasting";
export type { DeteriorationSignal, DeteriorationForecast } from "./predictive/EarlyDeteriorationForecasting";
export { useChronicProgressionPredictor } from "./predictive/ChronicProgressionPredictor";
export type { ChronicProgression, ProgressionModifier } from "./predictive/ChronicProgressionPredictor";
export { useRelapseProbabilityAnalyzer } from "./predictive/RelapseProbabilityAnalyzer";
export type { RelapseAssessment } from "./predictive/RelapseProbabilityAnalyzer";
export { useLongitudinalForecastingLayer } from "./predictive/LongitudinalForecastingLayer";
export type { LongitudinalForecast, ForecastPoint } from "./predictive/LongitudinalForecastingLayer";

// ── Multimodal Intelligence ──────────────
export { useMultimodalHealthFusion } from "./multimodal/MultimodalHealthFusion";
export type { ModalitySignal, FusedHealthInsight, MultimodalSnapshot } from "./multimodal/MultimodalHealthFusion";
export { useBehavioralSignalAnalyzer } from "./multimodal/BehavioralSignalAnalyzer";
export type { BehavioralSignal, BehavioralInsight } from "./multimodal/BehavioralSignalAnalyzer";
export { usePassiveContextAwareness } from "./multimodal/PassiveContextAwareness";
export type { PassiveContext } from "./multimodal/PassiveContextAwareness";
export { useEnvironmentalHealthContext } from "./multimodal/EnvironmentalHealthContext";
export type { EnvironmentalContext } from "./multimodal/EnvironmentalHealthContext";
export { useAdaptiveHealthPerception } from "./multimodal/AdaptiveHealthPerception";
export type { PerceptionProfile, PerceptionAdjustment } from "./multimodal/AdaptiveHealthPerception";

// ── Personalized Intelligence ────────────
export { usePersonalizedCompanionEvolution } from "./personalized/PersonalizedCompanionEvolution";
export type { CompanionEvolution, CompanionPersonality, LearnedPreference } from "./personalized/PersonalizedCompanionEvolution";
export { useAdaptiveCoachingEngine } from "./personalized/AdaptiveCoachingEngine";
export type { CoachingStrategy, CoachingEffectiveness } from "./personalized/AdaptiveCoachingEngine";
export { useEmotionalAdaptationFramework } from "./personalized/EmotionalAdaptationFramework";
export type { EmotionalState, EmotionalAdaptation } from "./personalized/EmotionalAdaptationFramework";
export { usePersonalizedHealthPacing } from "./personalized/PersonalizedHealthPacing";
export type { PacingProfile } from "./personalized/PersonalizedHealthPacing";
export { useDynamicSupportCalibration } from "./personalized/DynamicSupportCalibration";
export type { SupportCalibration } from "./personalized/DynamicSupportCalibration";

// ── Federated & Privacy ──────────────────
export { useFederatedLearningReadiness } from "./federated/FederatedLearningReadiness";
export type { FederatedReadinessAssessment } from "./federated/FederatedLearningReadiness";
export { useLocalAdaptationLayer } from "./federated/LocalAdaptationLayer";
export type { LocalAdaptation } from "./federated/LocalAdaptationLayer";
export { usePrivacyPreservingPersonalization } from "./federated/PrivacyPreservingPersonalization";
export type { PrivacyPersonalizationConfig, PersonalizationAudit } from "./federated/PrivacyPreservingPersonalization";
export { useDistributedIntelligenceCoordinator } from "./federated/DistributedIntelligenceCoordinator";
export type { IntelligenceNode, IntelligenceRouting } from "./federated/DistributedIntelligenceCoordinator";

// ── Clinical Collaboration ───────────────
export { useClinicalCollaborationWorkspace } from "./collaboration/ClinicalCollaborationWorkspace";
export type { CollaborationSession } from "./collaboration/ClinicalCollaborationWorkspace";
export { useSharedInvestigationReview } from "./collaboration/SharedInvestigationReview";
export type { SharedInvestigation } from "./collaboration/SharedInvestigationReview";
export { usePhysicianOversightReadiness } from "./collaboration/PhysicianOversightReadiness";
export type { OversightReadiness } from "./collaboration/PhysicianOversightReadiness";
export { useCollaborativeHealthReviewLayer } from "./collaboration/CollaborativeHealthReviewLayer";
export type { HealthReview } from "./collaboration/CollaborativeHealthReviewLayer";

// ── Research Intelligence ────────────────
export { useLongitudinalResearchAnalytics } from "./research/LongitudinalResearchAnalytics";
export type { ResearchCohort, CohortMetric, ResearchInsight } from "./research/LongitudinalResearchAnalytics";
export { useHealthOutcomeModeling } from "./research/HealthOutcomeModeling";
export type { OutcomeModel } from "./research/HealthOutcomeModeling";
export { useTrustBehaviorResearch } from "./research/TrustBehaviorResearch";
export type { TrustDataPoint, TrustResearchInsight } from "./research/TrustBehaviorResearch";
export { useEscalationPatternResearch } from "./research/EscalationPatternResearch";
export type { EscalationResearch } from "./research/EscalationPatternResearch";
export { usePredictiveValidationFramework } from "./research/PredictiveValidationFramework";
export type { ValidationMetrics } from "./research/PredictiveValidationFramework";

// ── Companion Intelligence ───────────────
export { useAdvancedCompanionIntelligence } from "./companion/AdvancedCompanionIntelligence";
export type { CompanionContext, CompanionResponse } from "./companion/AdvancedCompanionIntelligence";
export { useLongTermMemoryOrchestrator } from "./companion/LongTermMemoryOrchestrator";
export type { MemoryEntry } from "./companion/LongTermMemoryOrchestrator";
export { useProactiveInsightGenerator } from "./companion/ProactiveInsightGenerator";
export type { ProactiveInsight } from "./companion/ProactiveInsightGenerator";
export { useHealthJourneyCompanion } from "./companion/HealthJourneyCompanion";
export type { JourneyMilestone, JourneySummary } from "./companion/HealthJourneyCompanion";

// ── Ecosystem ────────────────────────────
export { useEcosystemIntegrationOrchestrator } from "./ecosystem/EcosystemIntegrationOrchestrator";
export type { EcosystemIntegration, IntegrationReadiness } from "./ecosystem/EcosystemIntegrationOrchestrator";
export { usePlatformMaturityAssessment } from "./ecosystem/PlatformMaturityAssessment";
export type { PlatformMaturity, MaturityDimension } from "./ecosystem/PlatformMaturityAssessment";
export { useHealthIntelligenceOrchestrator } from "./ecosystem/HealthIntelligenceOrchestrator";
export type { IntelligenceOrchestratorState } from "./ecosystem/HealthIntelligenceOrchestrator";
