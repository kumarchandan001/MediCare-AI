/**
 * DistributedRealtimeScaling — Manages distributed realtime scaling
 * with auto-scaling policies and load distribution.
 */
import { useCallback } from "react";

export interface ScalingPolicy {
  name: string;
  metric: string;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownSeconds: number;
  minInstances: number;
  maxInstances: number;
  currentInstances: number;
}

export function useDistributedRealtimeScaling() {
  const evaluate = useCallback((policies: ScalingPolicy[], currentMetrics: Record<string, number>): { actions: string[]; healthy: boolean } => {
    const actions: string[] = [];
    policies.forEach(p => {
      const value = currentMetrics[p.metric] ?? 0;
      if (value > p.scaleUpThreshold && p.currentInstances < p.maxInstances) actions.push(`Scale UP ${p.name}: ${p.currentInstances} → ${p.currentInstances + 1}`);
      else if (value < p.scaleDownThreshold && p.currentInstances > p.minInstances) actions.push(`Scale DOWN ${p.name}: ${p.currentInstances} → ${p.currentInstances - 1}`);
    });
    const overloaded = policies.filter(p => p.currentInstances >= p.maxInstances && (currentMetrics[p.metric] ?? 0) > p.scaleUpThreshold);
    return { actions, healthy: overloaded.length === 0 };
  }, []);

  return { evaluate };
}
