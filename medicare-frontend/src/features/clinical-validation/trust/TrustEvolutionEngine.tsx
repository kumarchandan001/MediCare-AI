/**
 * TrustEvolutionEngine — Models how user trust in the AI changes over time.
 * Combines explicit feedback (TrustFeedbackFramework) with implicit signals
 * (session length, feature re-engagement, escalation acceptance rate).
 */
import { useCallback, useState } from "react";

export interface TrustSnapshot {
  timestamp: number;
  explicitTrustScore: number; // from feedback
  implicitTrustScore: number; // from behavioral signals
  compositeTrustScore: number;
}

export function useTrustEvolutionEngine() {
  const [snapshots, setSnapshots] = useState<TrustSnapshot[]>([]);

  const recordSnapshot = useCallback((
    explicitScore: number,
    avgSessionMinutes: number,
    reEngagementRate: number // 0–1
  ) => {
    // Implicit trust: longer sessions + higher re-engagement = higher implicit trust
    const implicitScore = Math.min(100, (avgSessionMinutes / 10) * 30 + reEngagementRate * 70);
    const composite = explicitScore * 0.6 + implicitScore * 0.4;

    const snap: TrustSnapshot = {
      timestamp: Date.now(),
      explicitTrustScore: explicitScore,
      implicitTrustScore: implicitScore,
      compositeTrustScore: composite,
    };

    setSnapshots(prev => [...prev, snap]);
    return snap;
  }, []);

  const getTrustTrajectory = useCallback((): "growing" | "declining" | "stable" => {
    if (snapshots.length < 2) return "stable";
    const recent = snapshots.slice(-3);
    const first = recent[0].compositeTrustScore;
    const last = recent[recent.length - 1].compositeTrustScore;
    if (last - first > 5) return "growing";
    if (first - last > 5) return "declining";
    return "stable";
  }, [snapshots]);

  return { snapshots, recordSnapshot, getTrustTrajectory };
}
