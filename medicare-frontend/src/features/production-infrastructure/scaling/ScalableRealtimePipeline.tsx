/**
 * ScalableRealtimePipeline — Manages high-throughput realtime data
 * pipelines for wearable streams, monitoring signals, and health
 * event processing with adaptive batching and flow control.
 */
import { useCallback, useRef } from "react";

export interface RealtimePipeline {
  id: string;
  name: string;
  status: "active" | "paused" | "draining" | "stopped";
  inputRate: number;        // events/sec
  outputRate: number;       // events/sec
  bufferSize: number;
  bufferCapacity: number;
  batchSize: number;
  processingLatency: number; // ms
  droppedEvents: number;
}

export interface PipelineStage {
  name: string;
  type: "ingest" | "transform" | "filter" | "aggregate" | "emit";
  throughput: number;
  errorRate: number;
  backpressure: boolean;
}

export interface FlowControlConfig {
  maxInputRate: number;
  adaptiveBatching: boolean;
  minBatchSize: number;
  maxBatchSize: number;
  batchTimeoutMs: number;
  dropPolicy: "oldest" | "newest" | "priority";
}

const DEFAULT_FLOW: FlowControlConfig = {
  maxInputRate: 1000, adaptiveBatching: true,
  minBatchSize: 10, maxBatchSize: 100, batchTimeoutMs: 500,
  dropPolicy: "oldest",
};

export function useScalableRealtimePipeline(flowOverrides?: Partial<FlowControlConfig>) {
  const flowConfig = useRef<FlowControlConfig>({ ...DEFAULT_FLOW, ...flowOverrides });

  const evaluatePipeline = useCallback((pipeline: RealtimePipeline): { healthy: boolean; recommendation: string } => {
    const bufferUtil = pipeline.bufferSize / pipeline.bufferCapacity;
    if (bufferUtil > 0.9) return { healthy: false, recommendation: "Buffer near capacity — increase batch size or add consumers" };
    if (pipeline.inputRate > pipeline.outputRate * 1.5) return { healthy: false, recommendation: "Input rate significantly exceeds output — apply backpressure" };
    if (pipeline.droppedEvents > 0) return { healthy: false, recommendation: `${pipeline.droppedEvents} events dropped — review flow control policy` };
    if (pipeline.processingLatency > 1000) return { healthy: false, recommendation: `Processing latency ${pipeline.processingLatency}ms — optimize pipeline stages` };
    return { healthy: true, recommendation: "Pipeline operating normally" };
  }, []);

  const computeAdaptiveBatchSize = useCallback((currentRate: number, currentLatency: number): number => {
    const cfg = flowConfig.current;
    if (!cfg.adaptiveBatching) return cfg.minBatchSize;
    // Higher rate → larger batches; higher latency → smaller batches
    const rateFactor = Math.min(currentRate / cfg.maxInputRate, 1);
    const latencyFactor = Math.max(1 - currentLatency / 2000, 0.2);
    const optimal = Math.round(cfg.minBatchSize + (cfg.maxBatchSize - cfg.minBatchSize) * rateFactor * latencyFactor);
    return Math.max(cfg.minBatchSize, Math.min(cfg.maxBatchSize, optimal));
  }, []);

  const shouldApplyBackpressure = useCallback((pipeline: RealtimePipeline): boolean => {
    return pipeline.bufferSize > pipeline.bufferCapacity * 0.8 || pipeline.inputRate > flowConfig.current.maxInputRate;
  }, []);

  return { evaluatePipeline, computeAdaptiveBatchSize, shouldApplyBackpressure, getFlowConfig: () => flowConfig.current };
}
