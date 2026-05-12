/**
 * EnvironmentManagementLayer — Manages multi-tier environment configuration,
 * feature flags, and runtime environment detection.
 */
import { useCallback, useMemo, useRef } from "react";
import type { EnvironmentTier } from "./ProductionInfrastructureEngine";

export interface EnvironmentConfig {
  tier: EnvironmentTier;
  apiBaseUrl: string;
  wsBaseUrl: string;
  telemetryEndpoint: string | null;
  featureFlags: FeatureFlagSet;
  limits: EnvironmentLimits;
}

export interface FeatureFlagSet {
  realtimeMonitoring: boolean;
  predictiveIntelligence: boolean;
  wearableIntegration: boolean;
  advancedAnalytics: boolean;
  clinicalCollaboration: boolean;
  federatedLearning: boolean;
  experimentalFeatures: boolean;
}

export interface EnvironmentLimits {
  maxConcurrentConnections: number;
  maxWearableStreams: number;
  longitudinalHistoryDepth: number;
  cacheMaxSizeMB: number;
  websocketBufferSize: number;
  maxApiRetries: number;
}

const ENV_DEFAULTS: Record<EnvironmentTier, EnvironmentConfig> = {
  local: {
    tier: "local", apiBaseUrl: "http://localhost:8000", wsBaseUrl: "ws://localhost:8000",
    telemetryEndpoint: null,
    featureFlags: { realtimeMonitoring: true, predictiveIntelligence: true, wearableIntegration: true, advancedAnalytics: true, clinicalCollaboration: true, federatedLearning: true, experimentalFeatures: true },
    limits: { maxConcurrentConnections: 10, maxWearableStreams: 5, longitudinalHistoryDepth: 100, cacheMaxSizeMB: 50, websocketBufferSize: 500, maxApiRetries: 1 },
  },
  staging: {
    tier: "staging", apiBaseUrl: "https://staging-api.medicare-ai.health", wsBaseUrl: "wss://staging-api.medicare-ai.health",
    telemetryEndpoint: "https://telemetry-staging.medicare-ai.health",
    featureFlags: { realtimeMonitoring: true, predictiveIntelligence: true, wearableIntegration: true, advancedAnalytics: true, clinicalCollaboration: true, federatedLearning: false, experimentalFeatures: true },
    limits: { maxConcurrentConnections: 100, maxWearableStreams: 20, longitudinalHistoryDepth: 500, cacheMaxSizeMB: 200, websocketBufferSize: 2000, maxApiRetries: 3 },
  },
  production: {
    tier: "production", apiBaseUrl: "https://api.medicare-ai.health", wsBaseUrl: "wss://api.medicare-ai.health",
    telemetryEndpoint: "https://telemetry.medicare-ai.health",
    featureFlags: { realtimeMonitoring: true, predictiveIntelligence: true, wearableIntegration: true, advancedAnalytics: true, clinicalCollaboration: false, federatedLearning: false, experimentalFeatures: false },
    limits: { maxConcurrentConnections: 1000, maxWearableStreams: 100, longitudinalHistoryDepth: 2000, cacheMaxSizeMB: 500, websocketBufferSize: 5000, maxApiRetries: 5 },
  },
  research: {
    tier: "research", apiBaseUrl: "https://research-api.medicare-ai.health", wsBaseUrl: "wss://research-api.medicare-ai.health",
    telemetryEndpoint: "https://telemetry-research.medicare-ai.health",
    featureFlags: { realtimeMonitoring: true, predictiveIntelligence: true, wearableIntegration: true, advancedAnalytics: true, clinicalCollaboration: true, federatedLearning: true, experimentalFeatures: true },
    limits: { maxConcurrentConnections: 50, maxWearableStreams: 30, longitudinalHistoryDepth: 5000, cacheMaxSizeMB: 1000, websocketBufferSize: 10000, maxApiRetries: 3 },
  },
};

export function useEnvironmentManagement() {
  const overrides = useRef<Partial<EnvironmentConfig>>({});

  const detectEnvironment = useCallback((): EnvironmentTier => {
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    if (host === "localhost" || host === "127.0.0.1") return "local";
    if (host.includes("staging")) return "staging";
    if (host.includes("research")) return "research";
    return "production";
  }, []);

  const getConfig = useCallback((tier?: EnvironmentTier): EnvironmentConfig => {
    const t = tier || detectEnvironment();
    return { ...ENV_DEFAULTS[t], ...overrides.current } as EnvironmentConfig;
  }, [detectEnvironment]);

  const isFeatureEnabled = useCallback((flag: keyof FeatureFlagSet, tier?: EnvironmentTier): boolean => {
    return getConfig(tier).featureFlags[flag];
  }, [getConfig]);

  const applyOverrides = useCallback((u: Partial<EnvironmentConfig>) => {
    overrides.current = { ...overrides.current, ...u };
  }, []);

  const currentEnvironment = useMemo(() => detectEnvironment(), [detectEnvironment]);

  return { detectEnvironment, getConfig, isFeatureEnabled, applyOverrides, currentEnvironment };
}
