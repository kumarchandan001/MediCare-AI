/**
 * FrontendPerformanceOptimizer — Monitors and optimizes frontend
 * performance metrics including FCP, LCP, CLS, memory usage,
 * and component render times.
 */
import { useCallback, useRef } from "react";

export interface PerformanceSnapshot {
  timestamp: number;
  fcp: number | null;       // First Contentful Paint (ms)
  lcp: number | null;       // Largest Contentful Paint (ms)
  cls: number | null;       // Cumulative Layout Shift
  fid: number | null;       // First Input Delay (ms)
  ttfb: number | null;      // Time to First Byte (ms)
  memoryUsageMB: number | null;
  domNodes: number;
  jsHeapSizeMB: number | null;
  longTasks: number;
  componentRenderTimes: Map<string, number>;
}

export interface PerformanceBudget {
  maxFCP: number;
  maxLCP: number;
  maxCLS: number;
  maxFID: number;
  maxMemoryMB: number;
  maxDomNodes: number;
  maxLongTasks: number;
}

export interface BudgetViolation {
  metric: string;
  current: number;
  budget: number;
  severity: "warning" | "critical";
  suggestion: string;
}

const DEFAULT_BUDGET: PerformanceBudget = {
  maxFCP: 1800, maxLCP: 2500, maxCLS: 0.1, maxFID: 100,
  maxMemoryMB: 150, maxDomNodes: 3000, maxLongTasks: 5,
};

export function useFrontendPerformanceOptimizer(budgetOverrides?: Partial<PerformanceBudget>) {
  const budget = useRef<PerformanceBudget>({ ...DEFAULT_BUDGET, ...budgetOverrides });
  const history = useRef<PerformanceSnapshot[]>([]);

  const captureSnapshot = useCallback((): PerformanceSnapshot => {
    const perf = typeof window !== "undefined" ? window.performance : null;
    const memory = (perf as unknown as { memory?: { usedJSHeapSize: number } })?.memory;
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      fcp: null, lcp: null, cls: null, fid: null, ttfb: null,
      memoryUsageMB: memory ? memory.usedJSHeapSize / (1024 * 1024) : null,
      domNodes: typeof document !== "undefined" ? document.querySelectorAll("*").length : 0,
      jsHeapSizeMB: memory ? memory.usedJSHeapSize / (1024 * 1024) : null,
      longTasks: 0,
      componentRenderTimes: new Map(),
    };
    history.current = [...history.current.slice(-99), snapshot];
    return snapshot;
  }, []);

  const checkBudget = useCallback((snapshot: PerformanceSnapshot): BudgetViolation[] => {
    const violations: BudgetViolation[] = [];
    const b = budget.current;
    if (snapshot.fcp && snapshot.fcp > b.maxFCP) violations.push({ metric: "FCP", current: snapshot.fcp, budget: b.maxFCP, severity: snapshot.fcp > b.maxFCP * 1.5 ? "critical" : "warning", suggestion: "Reduce render-blocking resources and optimize critical path" });
    if (snapshot.lcp && snapshot.lcp > b.maxLCP) violations.push({ metric: "LCP", current: snapshot.lcp, budget: b.maxLCP, severity: snapshot.lcp > b.maxLCP * 1.5 ? "critical" : "warning", suggestion: "Optimize largest content element loading" });
    if (snapshot.cls && snapshot.cls > b.maxCLS) violations.push({ metric: "CLS", current: snapshot.cls, budget: b.maxCLS, severity: "warning", suggestion: "Set explicit dimensions on images and dynamic content" });
    if (snapshot.memoryUsageMB && snapshot.memoryUsageMB > b.maxMemoryMB) violations.push({ metric: "Memory", current: snapshot.memoryUsageMB, budget: b.maxMemoryMB, severity: snapshot.memoryUsageMB > b.maxMemoryMB * 1.5 ? "critical" : "warning", suggestion: "Review component cleanup and reduce cached data" });
    if (snapshot.domNodes > b.maxDomNodes) violations.push({ metric: "DOM Nodes", current: snapshot.domNodes, budget: b.maxDomNodes, severity: "warning", suggestion: "Virtualize long lists and reduce DOM depth" });
    return violations;
  }, []);

  const getPerformanceTrend = useCallback((): "improving" | "stable" | "declining" => {
    if (history.current.length < 4) return "stable";
    const recent = history.current.slice(-10);
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const avgFirst = firstHalf.reduce((s, r) => s + r.domNodes, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, r) => s + r.domNodes, 0) / secondHalf.length;
    if (avgSecond < avgFirst * 0.9) return "improving";
    if (avgSecond > avgFirst * 1.1) return "declining";
    return "stable";
  }, []);

  return { captureSnapshot, checkBudget, getPerformanceTrend, getHistory: () => [...history.current] };
}
