/**
 * DigitalTwinHealthProjection — Uses current trajectory data across all
 * domains to simulate a simplified "digital twin" projection of future
 * health state (e.g., in 30 days). Helps users visualize the compound
 * impact of their current habits.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface HealthProjection {
  targetDate: number;
  projectedOverallScore: number;
  projectedTrend: "improving" | "declining" | "stable";
  keyDrivers: string[];
  warningAreas: string[];
  narrative: string;
}

export function useDigitalTwinProjection() {
  const project = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    daysIntoFuture: number = 30
  ): HealthProjection => {
    let currentScoreTotal = 0;
    let count = 0;
    let netTrendInfluence = 0;
    
    const drivers: string[] = [];
    const warnings: string[] = [];

    for (const [domain, signal] of signals.entries()) {
      currentScoreTotal += signal.score;
      count++;

      // Simple weighting of trends
      if (signal.trend === "improving") {
        netTrendInfluence += 2;
        if (signal.score > 60) drivers.push(`Sustained improvement in ${domain.replace("_", " ")}`);
      } else if (signal.trend === "declining") {
        netTrendInfluence -= 2;
        warnings.push(`Current decline in ${domain.replace("_", " ")}`);
      }
    }

    const currentAvg = count > 0 ? currentScoreTotal / count : 50;
    
    // Project future score (bounded 0-100)
    // Roughly assumes trend continues linearly, dampened over time
    const projectionDelta = netTrendInfluence * (daysIntoFuture / 10);
    const projectedOverallScore = Math.max(0, Math.min(100, Math.round(currentAvg + projectionDelta)));

    let projectedTrend: HealthProjection["projectedTrend"] = "stable";
    if (projectedOverallScore > currentAvg + 5) projectedTrend = "improving";
    else if (projectedOverallScore < currentAvg - 5) projectedTrend = "declining";

    let narrative = "";
    if (projectedTrend === "improving") {
      narrative = `If you maintain your current habits, your digital twin projects a stronger, healthier state in ${daysIntoFuture} days.`;
    } else if (projectedTrend === "declining") {
      narrative = `Current trajectories suggest your health score may drop over the next ${daysIntoFuture} days. Small interventions now can change this path.`;
    } else {
      narrative = `Your health trajectory looks steady. Maintaining consistency is a success in itself.`;
    }

    return {
      targetDate: Date.now() + daysIntoFuture * 86_400_000,
      projectedOverallScore,
      projectedTrend,
      keyDrivers: drivers.slice(0, 3),
      warningAreas: warnings.slice(0, 3),
      narrative,
    };
  }, []);

  return { project };
}
