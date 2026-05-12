/**
 * LongitudinalComplianceAwareness — Tracks compliance posture over time
 * with trend analysis and proactive remediation recommendations.
 */
import { useCallback, useRef } from "react";

export interface ComplianceSnapshot {
  timestamp: number;
  overallScore: number;
  domainScores: Record<string, number>;
  openFindings: number;
  resolvedFindings: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
}

export function useLongitudinalComplianceAwareness() {
  const snapshots = useRef<ComplianceSnapshot[]>([]);

  const recordSnapshot = useCallback((snapshot: ComplianceSnapshot): void => {
    snapshots.current = [...snapshots.current.slice(-364), snapshot];
  }, []);

  const analyzeTrend = useCallback((): { direction: "improving" | "stable" | "declining"; velocity: number; forecast: string } => {
    if (snapshots.current.length < 3) return { direction: "stable", velocity: 0, forecast: "Insufficient data for trend analysis" };
    const recent = snapshots.current.slice(-10);
    const older = snapshots.current.slice(-20, -10);
    if (older.length === 0) return { direction: "stable", velocity: 0, forecast: "Building baseline" };
    const recentAvg = recent.reduce((s, sn) => s + sn.overallScore, 0) / recent.length;
    const olderAvg = older.reduce((s, sn) => s + sn.overallScore, 0) / older.length;
    const velocity = recentAvg - olderAvg;
    const direction = velocity > 2 ? "improving" as const : velocity < -2 ? "declining" as const : "stable" as const;
    const forecast = direction === "improving" ? "Compliance posture strengthening — maintain current remediation pace" : direction === "declining" ? "Compliance regression detected — prioritize open findings" : "Compliance stable — focus on continuous improvement";
    return { direction, velocity, forecast };
  }, []);

  return { recordSnapshot, analyzeTrend, getHistory: () => [...snapshots.current] };
}
