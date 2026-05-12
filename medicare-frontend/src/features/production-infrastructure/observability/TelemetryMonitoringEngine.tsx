/**
 * TelemetryMonitoringEngine — Collects, aggregates, and analyzes telemetry
 * data from all platform subsystems for operational insights.
 */
import { useCallback, useRef } from "react";

export interface TelemetryMetric {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: number;
}

export interface TelemetryAggregation {
  metric: string;
  period: "1m" | "5m" | "15m" | "1h" | "24h";
  min: number;
  max: number;
  avg: number;
  p95: number;
  p99: number;
  count: number;
}

export interface AlertRule {
  id: string;
  metric: string;
  condition: "above" | "below" | "equals";
  threshold: number;
  windowMs: number;
  severity: "warning" | "critical";
  enabled: boolean;
}

export function useTelemetryMonitoringEngine() {
  const metrics = useRef<TelemetryMetric[]>([]);
  const rules = useRef<AlertRule[]>([]);

  const record = useCallback((name: string, value: number, unit = "count", tags: Record<string, string> = {}): void => {
    metrics.current = [...metrics.current.slice(-4999), { name, value, unit, tags, timestamp: Date.now() }];
  }, []);

  const aggregate = useCallback((metricName: string, periodMs: number): TelemetryAggregation | null => {
    const cutoff = Date.now() - periodMs;
    const values = metrics.current.filter(m => m.name === metricName && m.timestamp > cutoff).map(m => m.value);
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const periodLabel = periodMs <= 60000 ? "1m" : periodMs <= 300000 ? "5m" : periodMs <= 900000 ? "15m" : periodMs <= 3600000 ? "1h" : "24h";
    return {
      metric: metricName, period: periodLabel as TelemetryAggregation["period"],
      min: sorted[0], max: sorted[sorted.length - 1],
      avg: values.reduce((s, v) => s + v, 0) / values.length,
      p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
      p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
      count: values.length,
    };
  }, []);

  const evaluateAlerts = useCallback((): { rule: AlertRule; triggered: boolean; currentValue: number }[] => {
    return rules.current.filter(r => r.enabled).map(rule => {
      const agg = aggregate(rule.metric, rule.windowMs);
      const val = agg?.avg || 0;
      let triggered = false;
      if (rule.condition === "above") triggered = val > rule.threshold;
      else if (rule.condition === "below") triggered = val < rule.threshold;
      else triggered = val === rule.threshold;
      return { rule, triggered, currentValue: val };
    });
  }, [aggregate]);

  const addRule = useCallback((rule: Omit<AlertRule, "id">): AlertRule => {
    const full = { ...rule, id: `rule-${Date.now()}` };
    rules.current.push(full);
    return full;
  }, []);

  return { record, aggregate, evaluateAlerts, addRule, getMetrics: () => [...metrics.current] };
}
