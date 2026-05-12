/**
 * ContinuousDeploymentPipeline — Manages automated CI/CD pipelines
 * with build validation, artifact management, and deployment triggers.
 */
import { useCallback, useRef } from "react";

export interface PipelineConfig {
  id: string;
  name: string;
  triggers: ("push" | "merge" | "schedule" | "manual")[];
  stages: CIStage[];
  notifications: { onSuccess: boolean; onFailure: boolean; channels: string[] };
}

export interface CIStage {
  name: string;
  type: "build" | "test" | "lint" | "security" | "deploy" | "verify";
  command: string;
  timeout: number;
  required: boolean;
  parallelizable: boolean;
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  status: "queued" | "running" | "passed" | "failed" | "cancelled";
  stages: { stage: CIStage; status: "pending" | "running" | "passed" | "failed"; duration: number | null; logs: string[] }[];
  startedAt: number;
  completedAt: number | null;
  commit: string;
  branch: string;
}

export function useContinuousDeploymentPipeline() {
  const executions = useRef<PipelineExecution[]>([]);

  const createExecution = useCallback((config: PipelineConfig, commit: string, branch = "main"): PipelineExecution => {
    const exec: PipelineExecution = {
      id: `exec-${Date.now()}`, pipelineId: config.id, status: "queued",
      stages: config.stages.map(s => ({ stage: s, status: "pending", duration: null, logs: [] })),
      startedAt: Date.now(), completedAt: null, commit, branch,
    };
    executions.current.push(exec);
    return exec;
  }, []);

  const getDefaultPipeline = useCallback((): PipelineConfig => ({
    id: "medicare-main", name: "MediCare Main Pipeline",
    triggers: ["push", "merge"],
    stages: [
      { name: "TypeScript Check", type: "build", command: "tsc --noEmit", timeout: 120000, required: true, parallelizable: true },
      { name: "ESLint", type: "lint", command: "eslint src/", timeout: 60000, required: true, parallelizable: true },
      { name: "Unit Tests", type: "test", command: "vitest run", timeout: 300000, required: true, parallelizable: false },
      { name: "Security Audit", type: "security", command: "npm audit", timeout: 60000, required: false, parallelizable: true },
      { name: "Build", type: "build", command: "vite build", timeout: 180000, required: true, parallelizable: false },
      { name: "Deploy", type: "deploy", command: "deploy.sh", timeout: 300000, required: true, parallelizable: false },
      { name: "Health Check", type: "verify", command: "health-check.sh", timeout: 60000, required: true, parallelizable: false },
    ],
    notifications: { onSuccess: false, onFailure: true, channels: ["slack-deploys"] },
  }), []);

  const getSuccessRate = useCallback((limit = 20): number => {
    const recent = executions.current.slice(-limit);
    if (recent.length === 0) return 100;
    return (recent.filter(e => e.status === "passed").length / recent.length) * 100;
  }, []);

  return { createExecution, getDefaultPipeline, getSuccessRate, getExecutions: () => [...executions.current] };
}
