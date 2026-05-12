/**
 * MultiDeviceHealthFusion — Fuses health signals from multiple devices
 * into a unified, conflict-resolved health picture.
 */
import { useCallback } from "react";

export interface DeviceSignal {
  deviceId: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: number;
  quality: number;
  source: string;
}

export interface FusedMetric {
  metric: string;
  fusedValue: number;
  unit: string;
  sources: string[];
  confidence: number;
  conflictDetected: boolean;
  resolution: string | null;
}

export function useMultiDeviceHealthFusion() {
  const fuseSignals = useCallback((signals: DeviceSignal[]): FusedMetric[] => {
    const byMetric = new Map<string, DeviceSignal[]>();
    signals.forEach(s => { const arr = byMetric.get(s.metric) || []; arr.push(s); byMetric.set(s.metric, arr); });
    const results: FusedMetric[] = [];
    byMetric.forEach((sigs, metric) => {
      const values = sigs.map(s => s.value);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const maxDiff = Math.max(...values) - Math.min(...values);
      const conflictThreshold = mean * 0.15;
      const conflict = values.length > 1 && maxDiff > conflictThreshold;
      const weightedSum = sigs.reduce((s, sig) => s + sig.value * sig.quality, 0);
      const totalWeight = sigs.reduce((s, sig) => s + sig.quality, 0);
      const fusedValue = totalWeight > 0 ? weightedSum / totalWeight : mean;
      results.push({ metric, fusedValue, unit: sigs[0].unit, sources: sigs.map(s => s.source), confidence: conflict ? 60 : 90, conflictDetected: conflict, resolution: conflict ? "Quality-weighted average applied" : null });
    });
    return results;
  }, []);

  return { fuseSignals };
}
