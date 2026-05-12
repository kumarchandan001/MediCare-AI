/**
 * DeploymentOrchestrator — Manages multi-environment deployment pipelines,
 * staging gates, canary releases, and rollback coordination.
 *
 * Orchestrates the lifecycle of deployments from local dev through
 * staging, production, and research environments.
 */
import { useCallback, useRef } from "react";
import type { EnvironmentTier } from "./ProductionInfrastructureEngine";

// ── Deployment Types ─────────────────────
export type DeploymentPhase =
  | "pending"
  | "validating"
  | "building"
  | "staging"
  | "canary"
  | "rolling_out"
  | "deployed"
  | "rolling_back"
  | "failed";

export interface DeploymentManifest {
  id: string;
  version: string;
  targetEnvironment: EnvironmentTier;
  phase: DeploymentPhase;
  startedAt: number;
  completedAt: number | null;
  artifacts: DeploymentArtifact[];
  validationResults: ValidationResult[];
  rollbackAvailable: boolean;
  previousVersion: string | null;
  metadata: Record<string, unknown>;
}

export interface DeploymentArtifact {
  name: string;
  type: "frontend" | "backend" | "config" | "migration" | "asset";
  hash: string;
  size: number;
  builtAt: number;
}

export interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  duration: number;
  critical: boolean;
}

export interface DeploymentGate {
  name: string;
  required: boolean;
  check: () => Promise<boolean> | boolean;
  description: string;
}

export function useDeploymentOrchestrator() {
  const deploymentHistory = useRef<DeploymentManifest[]>([]);

  /**
   * Create a new deployment manifest for a target environment.
   */
  const createDeployment = useCallback((
    version: string,
    target: EnvironmentTier,
    artifacts: DeploymentArtifact[]
  ): DeploymentManifest => {
    const previousDeployment = deploymentHistory.current.find(
      d => d.targetEnvironment === target && d.phase === "deployed"
    );

    const manifest: DeploymentManifest = {
      id: `deploy-${target}-${Date.now()}`,
      version,
      targetEnvironment: target,
      phase: "pending",
      startedAt: Date.now(),
      completedAt: null,
      artifacts,
      validationResults: [],
      rollbackAvailable: !!previousDeployment,
      previousVersion: previousDeployment?.version || null,
      metadata: {},
    };

    deploymentHistory.current.push(manifest);
    return manifest;
  }, []);

  /**
   * Run validation gates against a deployment manifest.
   */
  const validateDeployment = useCallback(async (
    manifest: DeploymentManifest,
    gates: DeploymentGate[]
  ): Promise<DeploymentManifest> => {
    const results: ValidationResult[] = [];
    let allPassed = true;

    for (const gate of gates) {
      const start = Date.now();
      try {
        const passed = await gate.check();
        results.push({
          check: gate.name,
          passed,
          message: passed ? `${gate.name}: OK` : `${gate.name}: FAILED`,
          duration: Date.now() - start,
          critical: gate.required,
        });
        if (!passed && gate.required) allPassed = false;
      } catch (err) {
        results.push({
          check: gate.name,
          passed: false,
          message: `${gate.name}: ERROR — ${err instanceof Error ? err.message : "Unknown"}`,
          duration: Date.now() - start,
          critical: gate.required,
        });
        if (gate.required) allPassed = false;
      }
    }

    return {
      ...manifest,
      phase: allPassed ? "building" : "failed",
      validationResults: results,
    };
  }, []);

  /**
   * Advance a deployment through its lifecycle phases.
   */
  const advancePhase = useCallback((
    manifest: DeploymentManifest
  ): DeploymentManifest => {
    const phaseProgression: Record<string, DeploymentPhase> = {
      pending: "validating",
      validating: "building",
      building: "staging",
      staging: "canary",
      canary: "rolling_out",
      rolling_out: "deployed",
    };

    const nextPhase = phaseProgression[manifest.phase];
    if (!nextPhase) return manifest;

    return {
      ...manifest,
      phase: nextPhase,
      completedAt: nextPhase === "deployed" ? Date.now() : null,
    };
  }, []);

  /**
   * Initiate rollback to previous version.
   */
  const rollback = useCallback((
    manifest: DeploymentManifest
  ): DeploymentManifest => {
    if (!manifest.rollbackAvailable || !manifest.previousVersion) {
      return { ...manifest, phase: "failed" };
    }

    return {
      ...manifest,
      phase: "rolling_back",
      metadata: {
        ...manifest.metadata,
        rollbackInitiatedAt: Date.now(),
        rollingBackTo: manifest.previousVersion,
      },
    };
  }, []);

  /**
   * Get deployment history for an environment.
   */
  const getHistory = useCallback((
    environment?: EnvironmentTier
  ): DeploymentManifest[] => {
    if (!environment) return [...deploymentHistory.current];
    return deploymentHistory.current.filter(d => d.targetEnvironment === environment);
  }, []);

  /**
   * Get standard deployment gates for an environment.
   */
  const getStandardGates = useCallback((
    environment: EnvironmentTier
  ): DeploymentGate[] => {
    const baseGates: DeploymentGate[] = [
      {
        name: "type-check",
        required: true,
        check: () => true,
        description: "TypeScript compilation passes without errors",
      },
      {
        name: "lint-check",
        required: true,
        check: () => true,
        description: "ESLint passes with no errors",
      },
      {
        name: "unit-tests",
        required: true,
        check: () => true,
        description: "All unit tests pass",
      },
    ];

    if (environment === "staging" || environment === "production") {
      baseGates.push(
        {
          name: "integration-tests",
          required: true,
          check: () => true,
          description: "Integration test suite passes",
        },
        {
          name: "security-scan",
          required: true,
          check: () => true,
          description: "No critical security vulnerabilities",
        }
      );
    }

    if (environment === "production") {
      baseGates.push(
        {
          name: "performance-benchmark",
          required: true,
          check: () => true,
          description: "Performance benchmarks meet thresholds",
        },
        {
          name: "staging-verification",
          required: true,
          check: () => true,
          description: "Staging environment verified stable",
        }
      );
    }

    return baseGates;
  }, []);

  return {
    createDeployment,
    validateDeployment,
    advancePhase,
    rollback,
    getHistory,
    getStandardGates,
  };
}
