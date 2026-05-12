/**
 * DeploymentPipelineCoordinator — Orchestrates end-to-end deployment
 * pipelines with stage progression, approvals, and rollback triggers.
 */
import { useCallback, useRef } from "react";
import type { EnvironmentTier } from "../core/ProductionInfrastructureEngine";

export type PipelineStage = "source" | "build" | "test" | "security_scan" | "staging_deploy" | "integration_test" | "approval" | "production_deploy" | "verify";

export interface PipelineRun {
  id: string;
  pipelineId: string;
  targetEnvironment: EnvironmentTier;
  stages: PipelineStageResult[];
  currentStage: PipelineStage;
  status: "running" | "paused" | "succeeded" | "failed" | "cancelled";
  startedAt: number;
  completedAt: number | null;
  triggeredBy: string;
}

export interface PipelineStageResult {
  stage: PipelineStage;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  startedAt: number | null;
  completedAt: number | null;
  logs: string[];
  artifacts: string[];
}

export function useDeploymentPipelineCoordinator() {
  const runs = useRef<PipelineRun[]>([]);

  const STAGE_ORDER: PipelineStage[] = ["source", "build", "test", "security_scan", "staging_deploy", "integration_test", "approval", "production_deploy", "verify"];

  const createPipelineRun = useCallback((target: EnvironmentTier, triggeredBy = "system"): PipelineRun => {
    const stages: PipelineStageResult[] = STAGE_ORDER.map(s => ({
      stage: s, status: "pending", startedAt: null, completedAt: null, logs: [], artifacts: [],
    }));
    const run: PipelineRun = {
      id: `run-${Date.now()}`, pipelineId: `pipeline-${target}`, targetEnvironment: target,
      stages, currentStage: "source", status: "running", startedAt: Date.now(), completedAt: null, triggeredBy,
    };
    runs.current.push(run);
    return run;
  }, []);

  const advanceStage = useCallback((run: PipelineRun, passed: boolean): PipelineRun => {
    const idx = STAGE_ORDER.indexOf(run.currentStage);
    const updatedStages = [...run.stages];
    updatedStages[idx] = { ...updatedStages[idx], status: passed ? "passed" : "failed", completedAt: Date.now() };
    if (!passed) return { ...run, stages: updatedStages, status: "failed", completedAt: Date.now() };
    if (idx >= STAGE_ORDER.length - 1) return { ...run, stages: updatedStages, status: "succeeded", completedAt: Date.now() };
    const nextStage = STAGE_ORDER[idx + 1];
    updatedStages[idx + 1] = { ...updatedStages[idx + 1], status: "running", startedAt: Date.now() };
    return { ...run, stages: updatedStages, currentStage: nextStage };
  }, []);

  const cancelRun = useCallback((run: PipelineRun): PipelineRun => {
    return { ...run, status: "cancelled", completedAt: Date.now() };
  }, []);

  return { createPipelineRun, advanceStage, cancelRun, getRuns: () => [...runs.current] };
}
