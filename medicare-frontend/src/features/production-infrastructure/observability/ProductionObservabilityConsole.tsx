/**
 * ProductionObservabilityConsole — Central observability hub aggregating
 * telemetry, logs, traces, and metrics across all production subsystems.
 */
import { useCallback, useRef } from "react";

export interface ObservabilityEvent {
  id: string;
  source: string;
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  traceId: string | null;
  spanId: string | null;
}

export interface SystemTrace {
  traceId: string;
  spans: TraceSpan[];
  startTime: number;
  endTime: number | null;
  status: "active" | "completed" | "error";
}

export interface TraceSpan {
  spanId: string;
  parentSpanId: string | null;
  operation: string;
  startTime: number;
  endTime: number | null;
  tags: Record<string, string>;
}

export interface ObservabilitySummary {
  totalEvents: number;
  errorRate: number;
  avgLatency: number;
  activeTraces: number;
  topErrors: { message: string; count: number }[];
  healthScore: number;
}

export function useProductionObservabilityConsole() {
  const events = useRef<ObservabilityEvent[]>([]);
  const traces = useRef<Map<string, SystemTrace>>(new Map());

  const log = useCallback((source: string, level: ObservabilityEvent["level"], message: string, metadata: Record<string, unknown> = {}, traceId: string | null = null): ObservabilityEvent => {
    const event: ObservabilityEvent = { id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, source, level, message, timestamp: Date.now(), metadata, traceId, spanId: null };
    events.current = [...events.current.slice(-999), event];
    return event;
  }, []);

  const startTrace = useCallback((operation: string): SystemTrace => {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const trace: SystemTrace = { traceId, spans: [{ spanId: `span-root-${Date.now()}`, parentSpanId: null, operation, startTime: Date.now(), endTime: null, tags: {} }], startTime: Date.now(), endTime: null, status: "active" };
    traces.current.set(traceId, trace);
    return trace;
  }, []);

  const endTrace = useCallback((traceId: string, status: "completed" | "error" = "completed") => {
    const trace = traces.current.get(traceId);
    if (!trace) return;
    trace.endTime = Date.now();
    trace.status = status;
    trace.spans.forEach(s => { if (!s.endTime) s.endTime = Date.now(); });
  }, []);

  const getSummary = useCallback((windowMs = 3600000): ObservabilitySummary => {
    const cutoff = Date.now() - windowMs;
    const recent = events.current.filter(e => e.timestamp > cutoff);
    const errors = recent.filter(e => e.level === "error" || e.level === "fatal");
    const errorGroups = errors.reduce<Record<string, number>>((acc, e) => { acc[e.message] = (acc[e.message] || 0) + 1; return acc; }, {});
    return {
      totalEvents: recent.length,
      errorRate: recent.length > 0 ? errors.length / recent.length : 0,
      avgLatency: 0,
      activeTraces: Array.from(traces.current.values()).filter(t => t.status === "active").length,
      topErrors: Object.entries(errorGroups).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([message, count]) => ({ message, count })),
      healthScore: Math.max(0, 100 - errors.length * 5),
    };
  }, []);

  const queryEvents = useCallback((filter: { source?: string; level?: ObservabilityEvent["level"]; since?: number }): ObservabilityEvent[] => {
    return events.current.filter(e => (!filter.source || e.source === filter.source) && (!filter.level || e.level === filter.level) && (!filter.since || e.timestamp >= filter.since));
  }, []);

  return { log, startTrace, endTrace, getSummary, queryEvents };
}
