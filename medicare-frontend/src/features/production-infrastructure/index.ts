/**
 * production-infrastructure — Phase 8 Barrel Index
 *
 * Exports all production infrastructure, scaling, performance, security,
 * observability, resilience, CI/CD, and mobile optimization modules.
 */

// ── Core ─────────────────────────────────
export { useProductionInfrastructureEngine } from "./core/ProductionInfrastructureEngine";
export type { InfrastructureHealthReport, SubsystemHealth, InfraAlert, InfrastructureConfig, EnvironmentTier, RecoveryAction, InfrastructureStatus } from "./core/ProductionInfrastructureEngine";
export { useDeploymentOrchestrator } from "./core/DeploymentOrchestrator";
export type { DeploymentManifest, DeploymentGate, DeploymentPhase } from "./core/DeploymentOrchestrator";
export { useEnvironmentManagement } from "./core/EnvironmentManagementLayer";
export type { EnvironmentConfig, FeatureFlagSet, EnvironmentLimits } from "./core/EnvironmentManagementLayer";
export { default as InfrastructureStateProvider, useInfrastructureContext } from "./core/InfrastructureStateProvider";
export { useOperationalStabilityCoordinator } from "./core/OperationalStabilityCoordinator";
export type { StabilitySnapshot } from "./core/OperationalStabilityCoordinator";

// ── Cloud Deployment ─────────────────────
export { useCloudDeploymentManager } from "./cloud/CloudDeploymentManager";
export type { CloudDeployment, ScalingPolicy } from "./cloud/CloudDeploymentManager";
export { useMultiEnvironmentConfig } from "./cloud/MultiEnvironmentConfig";
export { useInfrastructureProvisioning } from "./cloud/InfrastructureProvisioning";
export type { ProvisioningPlan } from "./cloud/InfrastructureProvisioning";
export { useDeploymentPipelineCoordinator } from "./cloud/DeploymentPipelineCoordinator";
export type { PipelineRun } from "./cloud/DeploymentPipelineCoordinator";
export { useBackupRecoveryInfrastructure } from "./cloud/BackupRecoveryInfrastructure";
export type { BackupManifest, RecoveryPlan } from "./cloud/BackupRecoveryInfrastructure";

// ── Scaling ──────────────────────────────
export { useWebSocketScalingEngine } from "./scaling/WebSocketScalingEngine";
export type { WSConnectionPool, WSConnection } from "./scaling/WebSocketScalingEngine";
export { useDistributedStateCoordinator } from "./scaling/DistributedStateCoordinator";
export { useQueueOrchestrationLayer } from "./scaling/QueueOrchestrationLayer";
export type { QueuedTask, QueueMetrics } from "./scaling/QueueOrchestrationLayer";
export { useAsyncHealthTaskManager } from "./scaling/AsyncHealthTaskManager";
export type { AsyncHealthTask } from "./scaling/AsyncHealthTaskManager";
export { useScalableRealtimePipeline } from "./scaling/ScalableRealtimePipeline";
export type { RealtimePipeline } from "./scaling/ScalableRealtimePipeline";

// ── Performance ──────────────────────────
export { useFrontendPerformanceOptimizer } from "./performance/FrontendPerformanceOptimizer";
export type { PerformanceSnapshot, PerformanceBudget, BudgetViolation } from "./performance/FrontendPerformanceOptimizer";
export { useRealtimeRenderingOptimizer } from "./performance/RealtimeRenderingOptimizer";
export { useIndexedDBPerformanceLayer } from "./performance/IndexedDBPerformanceLayer";
export { useLongitudinalCacheEngine } from "./performance/LongitudinalCacheEngine";
export { useAdaptiveResourceManager } from "./performance/AdaptiveResourceManager";
export type { DeviceCapabilities, ResourceAllocation } from "./performance/AdaptiveResourceManager";

// ── Security ─────────────────────────────
export { useSecurityInfrastructureLayer } from "./security/SecurityInfrastructureLayer";
export type { SecurityAssessment, SecurityFinding, ThreatEvent } from "./security/SecurityInfrastructureLayer";
export { useSessionSecurityManager } from "./security/SessionSecurityManager";
export type { SecureSession, SessionPolicy } from "./security/SessionSecurityManager";
export { useAPIProtectionEngine } from "./security/APIProtectionEngine";
export type { CircuitBreaker } from "./security/APIProtectionEngine";
export { useAuthHardeningFramework } from "./security/AuthHardeningFramework";
export type { TokenLifecycle, AuthStrengthScore } from "./security/AuthHardeningFramework";
export { usePrivacyIsolationLayer } from "./security/PrivacyIsolationLayer";
export type { PrivacyClassification, ConsentRecord } from "./security/PrivacyIsolationLayer";

// ── Observability ────────────────────────
export { useProductionObservabilityConsole } from "./observability/ProductionObservabilityConsole";
export type { ObservabilityEvent, SystemTrace, ObservabilitySummary } from "./observability/ProductionObservabilityConsole";
export { useTelemetryMonitoringEngine } from "./observability/TelemetryMonitoringEngine";
export type { TelemetryMetric, TelemetryAggregation, AlertRule } from "./observability/TelemetryMonitoringEngine";
export { useFailureAnalyticsDashboard } from "./observability/FailureAnalyticsDashboard";
export type { FailureRecord, FailureAnalytics } from "./observability/FailureAnalyticsDashboard";
export { useHealthInfrastructureMetrics } from "./observability/HealthInfrastructureMetrics";
export type { InfraHealthMetrics } from "./observability/HealthInfrastructureMetrics";
export { useRealtimeOperationalMonitor } from "./observability/RealtimeOperationalMonitor";
export type { OperationalStatus } from "./observability/RealtimeOperationalMonitor";

// ── Resilience ───────────────────────────
export { useGracefulDegradationEngine } from "./resilience/GracefulDegradationEngine";
export type { DegradationState, DegradableFeature } from "./resilience/GracefulDegradationEngine";
export { useSessionRecoveryManager } from "./resilience/SessionRecoveryManager";
export type { SessionSnapshot, RecoveryResult } from "./resilience/SessionRecoveryManager";
export { useRealtimeReconnectCoordinator } from "./resilience/RealtimeReconnectCoordinator";
export type { ReconnectState } from "./resilience/RealtimeReconnectCoordinator";
export { useLongitudinalRestorationEngine } from "./resilience/LongitudinalRestorationEngine";
export type { RestorationPlan } from "./resilience/LongitudinalRestorationEngine";
export { useInfrastructureRecoveryFlow } from "./resilience/InfrastructureRecoveryFlow";
export type { RecoveryFlow } from "./resilience/InfrastructureRecoveryFlow";

// ── CI/CD ────────────────────────────────
export { useContinuousDeploymentPipeline } from "./cicd/ContinuousDeploymentPipeline";
export type { PipelineConfig, PipelineExecution } from "./cicd/ContinuousDeploymentPipeline";
export { useAutomatedTestingCoordinator } from "./cicd/AutomatedTestingCoordinator";
export type { TestSuite, TestRunResult } from "./cicd/AutomatedTestingCoordinator";
export { useRollbackManagementLayer } from "./cicd/RollbackManagementLayer";
export type { RollbackDecision } from "./cicd/RollbackManagementLayer";
export { useEnvironmentValidationEngine } from "./cicd/EnvironmentValidationEngine";
export type { EnvironmentValidation } from "./cicd/EnvironmentValidationEngine";
export { useInfrastructureIntegrityChecks } from "./cicd/InfrastructureIntegrityChecks";
export type { IntegrityReport } from "./cicd/InfrastructureIntegrityChecks";

// ── Mobile ───────────────────────────────
export { useMobilePerformanceCoordinator } from "./mobile/MobilePerformanceCoordinator";
export type { MobilePerformanceProfile } from "./mobile/MobilePerformanceCoordinator";
export { useAdaptiveMobileStreaming } from "./mobile/AdaptiveMobileStreaming";
export { useBatteryAwareMonitoring } from "./mobile/BatteryAwareMonitoring";
export type { BatteryState, MonitoringAdjustment } from "./mobile/BatteryAwareMonitoring";
export { useResourceEfficientRealtimeUX } from "./mobile/ResourceEfficientRealtimeUX";
