/**
 * SecurityInfrastructureLayer — Core security infrastructure providing
 * threat detection, security scoring, and vulnerability assessment.
 */
import { useCallback, useRef } from "react";

export interface SecurityAssessment {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  findings: SecurityFinding[];
  lastAssessed: number;
  complianceStatus: Record<string, boolean>;
}

export interface SecurityFinding {
  id: string;
  category: "auth" | "data" | "network" | "session" | "input" | "config";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  remediation: string;
  resolved: boolean;
}

export interface ThreatEvent {
  id: string;
  type: "brute_force" | "injection" | "xss" | "csrf" | "session_hijack" | "data_exfil" | "anomaly";
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  timestamp: number;
  blocked: boolean;
  details: string;
}

export function useSecurityInfrastructureLayer() {
  const events = useRef<ThreatEvent[]>([]);

  const assessSecurity = useCallback((findings: SecurityFinding[]): SecurityAssessment => {
    const unresolved = findings.filter(f => !f.resolved);
    const criticals = unresolved.filter(f => f.severity === "critical").length;
    const highs = unresolved.filter(f => f.severity === "high").length;
    let score = 100 - criticals * 25 - highs * 10 - unresolved.length * 2;
    score = Math.max(0, Math.min(100, score));
    let grade: SecurityAssessment["grade"] = "A";
    if (score < 90) grade = "B";
    if (score < 75) grade = "C";
    if (score < 60) grade = "D";
    if (score < 40) grade = "F";
    return {
      overallScore: score, grade, findings, lastAssessed: Date.now(),
      complianceStatus: { httpsEnforced: true, csrfProtection: criticals === 0, inputSanitization: !findings.some(f => f.category === "input" && !f.resolved), sessionSecurity: !findings.some(f => f.category === "session" && !f.resolved) },
    };
  }, []);

  const recordThreatEvent = useCallback((event: Omit<ThreatEvent, "id" | "timestamp">): ThreatEvent => {
    const full: ThreatEvent = { ...event, id: `threat-${Date.now()}`, timestamp: Date.now() };
    events.current = [...events.current.slice(-499), full];
    return full;
  }, []);

  const getThreatSummary = useCallback(() => {
    const recent = events.current.filter(e => Date.now() - e.timestamp < 3600000);
    return {
      totalThreats: events.current.length,
      recentThreats: recent.length,
      blockedRate: events.current.length > 0 ? events.current.filter(e => e.blocked).length / events.current.length : 1,
      topCategories: Object.entries(recent.reduce<Record<string, number>>((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]),
    };
  }, []);

  return { assessSecurity, recordThreatEvent, getThreatSummary };
}
