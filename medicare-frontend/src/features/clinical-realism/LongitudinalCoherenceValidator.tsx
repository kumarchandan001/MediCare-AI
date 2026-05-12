/**
 * LongitudinalCoherenceValidator — Ensures investigations remain consistent
 * across sessions. Validates that follow-ups align with prior history,
 * recurring symptoms evolve logically, and narratives don't contradict
 * previously established findings.
 */
import { useCallback, useRef } from "react";
import { useTemporalHealth } from "@/features/longitudinal-health/TemporalHealthStateProvider";

export interface CoherenceViolation {
  type: "contradictory_outcome" | "impossible_recurrence" | "severity_regression" | "narrative_break" | "timeline_gap";
  description: string;
  suggestedResolution: string;
  severity: "low" | "medium" | "high";
  timestamp: number;
}

export interface LongitudinalCoherenceReport {
  isCoherent: boolean;
  score: number;            // 0-100
  violations: CoherenceViolation[];
  memoryIntegrity: "intact" | "minor_gaps" | "significant_gaps";
  continuityNarrative: string;
}

export function useLongitudinalCoherence() {
  const temporal = useTemporalHealth();
  const pastViolationsRef = useRef<CoherenceViolation[]>([]);

  const validate = useCallback((): LongitudinalCoherenceReport => {
    const violations: CoherenceViolation[] = [];
    const { investigations, recurringPatterns, activeRecovery } = temporal;

    // 1. Contradictory outcomes within short timeframe
    for (let i = 1; i < investigations.length; i++) {
      const prev = investigations[i - 1];
      const curr = investigations[i];
      const hoursBetween = (curr.timestamp - prev.timestamp) / 3_600_000;

      // Resolved → worsened in < 12 hours
      if (prev.outcome === "resolved" && curr.outcome === "worsened" && hoursBetween < 12) {
        violations.push({
          type: "contradictory_outcome",
          description: `"${prev.primaryFinding}" was marked resolved but worsened within ${hoursBetween.toFixed(0)} hours.`,
          suggestedResolution: "Previous resolution may have been premature — consider revising to 'improving' instead.",
          severity: "high",
          timestamp: Date.now(),
        });
      }

      // Same condition went from high to low severity too quickly
      if (prev.primaryFinding === curr.primaryFinding) {
        const sevDelta = (prev.recoveryScore || 0) - (curr.recoveryScore || 0);
        if (sevDelta > 50 && hoursBetween < 24) {
          violations.push({
            type: "severity_regression",
            description: `Severity of "${prev.primaryFinding}" dropped ${sevDelta} points in ${hoursBetween.toFixed(0)} hours.`,
            suggestedResolution: "Rapid severity drop may indicate measurement error or should be marked as 'fragile recovery'.",
            severity: "medium",
            timestamp: Date.now(),
          });
        }
      }
    }

    // 2. Recurring pattern coherence
    for (const pattern of recurringPatterns) {
      if (pattern.occurrences >= 4 && pattern.severity === "mild") {
        violations.push({
          type: "narrative_break",
          description: `"${pattern.symptomCluster[0]?.replace(/_/g, " ")}" has recurred ${pattern.occurrences} times but remains classified as "mild".`,
          suggestedResolution: "Consider reclassifying as moderate or flagging for professional review.",
          severity: "medium",
          timestamp: Date.now(),
        });
      }

      // Check if pattern interval is impossibly short (< 6 hours between recurrences)
      if (pattern.averageInterval !== undefined && pattern.averageInterval < 0.25) {
        violations.push({
          type: "impossible_recurrence",
          description: `Recurrence pattern for "${pattern.symptomCluster[0]?.replace(/_/g, " ")}" averages ${(pattern.averageInterval * 24).toFixed(1)} hours — this may represent a single ongoing episode.`,
          suggestedResolution: "Consider merging recent occurrences into a single ongoing investigation.",
          severity: "low",
          timestamp: Date.now(),
        });
      }
    }

    // 3. Active recovery coherence
    if (activeRecovery && investigations.length > 0) {
      const lastInv = investigations[investigations.length - 1];
      if (lastInv.outcome === "worsened" && activeRecovery.trend === "improving") {
        violations.push({
          type: "narrative_break",
          description: "Last investigation outcome is 'worsened' but active recovery trend shows 'improving'.",
          suggestedResolution: "Synchronize recovery trend with latest investigation outcome.",
          severity: "high",
          timestamp: Date.now(),
        });
      }
    }

    // 4. Timeline gaps (> 30 days between investigations for same condition)
    for (let i = 1; i < investigations.length; i++) {
      const prev = investigations[i - 1];
      const curr = investigations[i];
      if (prev.primaryFinding === curr.primaryFinding) {
        const daysBetween = (curr.timestamp - prev.timestamp) / 86_400_000;
        if (daysBetween > 30 && curr.outcome !== "resolved") {
          violations.push({
            type: "timeline_gap",
            description: `${daysBetween.toFixed(0)}-day gap in tracking "${prev.primaryFinding}".`,
            suggestedResolution: "Long gaps may affect reasoning accuracy — consider re-establishing baseline.",
            severity: "low",
            timestamp: Date.now(),
          });
        }
      }
    }

    // Store violations
    pastViolationsRef.current.push(...violations);
    if (pastViolationsRef.current.length > 200) {
      pastViolationsRef.current = pastViolationsRef.current.slice(-100);
    }

    // Score
    const score = Math.max(0, 100 - violations.reduce((p, v) => {
      if (v.severity === "high") return p + 20;
      if (v.severity === "medium") return p + 10;
      return p + 3;
    }, 0));

    // Memory integrity
    let memoryIntegrity: LongitudinalCoherenceReport["memoryIntegrity"];
    if (score >= 85) memoryIntegrity = "intact";
    else if (score >= 60) memoryIntegrity = "minor_gaps";
    else memoryIntegrity = "significant_gaps";

    // Narrative
    let narrative: string;
    if (violations.length === 0) {
      narrative = "Health history is longitudinally consistent — all investigations align with prior findings.";
    } else if (violations.filter(v => v.severity === "high").length > 0) {
      narrative = "Some longitudinal inconsistencies were detected that may affect reasoning accuracy. The AI is adjusting its approach accordingly.";
    } else {
      narrative = "Minor longitudinal observations noted — overall health continuity remains coherent.";
    }

    return { isCoherent: score >= 70, score, violations, memoryIntegrity, continuityNarrative: narrative };
  }, [temporal]);

  const getViolationHistory = useCallback(() => [...pastViolationsRef.current], []);

  return { validate, getViolationHistory };
}
