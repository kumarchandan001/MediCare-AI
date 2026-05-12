/**
 * RealtimeOperationalMonitor — Live operational monitoring with anomaly
 * detection, threshold alerts, and operational status broadcasting.
 */
import { useCallback, useRef } from "react";

export interface OperationalMetricPoint {
  metric: string;
  value: number;
  timestamp: number;
  anomaly: boolean;
  anomalyScore: number;
}

export interface OperationalStatus {
  overall: "operational" | "degraded" | "partial_outage" | "major_outage";
  components: { name: string; status: "operational" | "degraded" | "outage"; lastChecked: number }[];
  lastUpdated: number;
  incidentCount: number;
}

export function useRealtimeOperationalMonitor() {
  const timeSeries = useRef<Map<string, OperationalMetricPoint[]>>(new Map());

  const recordMetric = useCallback((metric: string, value: number): OperationalMetricPoint => {
    const history = timeSeries.current.get(metric) || [];
    // Simple anomaly detection: >2 std deviations from mean
    const recentValues = history.slice(-50).map(p => p.value);
    let anomaly = false;
    let anomalyScore = 0;
    if (recentValues.length >= 10) {
      const mean = recentValues.reduce((s, v) => s + v, 0) / recentValues.length;
      const std = Math.sqrt(recentValues.reduce((s, v) => s + (v - mean) ** 2, 0) / recentValues.length);
      if (std > 0) { anomalyScore = Math.abs(value - mean) / std; anomaly = anomalyScore > 2; }
    }
    const point: OperationalMetricPoint = { metric, value, timestamp: Date.now(), anomaly, anomalyScore };
    timeSeries.current.set(metric, [...history.slice(-199), point]);
    return point;
  }, []);

  const getStatus = useCallback((components: { name: string; errorRate: number; latency: number }[]): OperationalStatus => {
    const statuses = components.map(c => ({
      name: c.name,
      status: (c.errorRate > 50 ? "outage" : c.errorRate > 10 ? "degraded" : "operational") as "operational" | "degraded" | "outage",
      lastChecked: Date.now(),
    }));
    const outages = statuses.filter(s => s.status === "outage").length;
    const degraded = statuses.filter(s => s.status === "degraded").length;
    let overall: OperationalStatus["overall"] = "operational";
    if (outages > statuses.length * 0.5) overall = "major_outage";
    else if (outages > 0) overall = "partial_outage";
    else if (degraded > 0) overall = "degraded";
    return { overall, components: statuses, lastUpdated: Date.now(), incidentCount: outages + degraded };
  }, []);

  const getAnomalies = useCallback((windowMs = 3600000): OperationalMetricPoint[] => {
    const cutoff = Date.now() - windowMs;
    const anomalies: OperationalMetricPoint[] = [];
    timeSeries.current.forEach(points => { anomalies.push(...points.filter(p => p.anomaly && p.timestamp > cutoff)); });
    return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
  }, []);

  return { recordMetric, getStatus, getAnomalies };
}
