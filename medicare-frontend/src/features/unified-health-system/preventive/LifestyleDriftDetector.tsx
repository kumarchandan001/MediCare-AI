/**
 * LifestyleDriftDetector — Detects gradual lifestyle deterioration:
 * declining activity, worsening sleep, increasing stress, nutrition
 * degradation. Alerts BEFORE clinical thresholds are crossed.
 */
import { useCallback } from "react";
import type { HealthDomain } from "../UnifiedHealthEngine";

export interface DriftSignal {
  domain: HealthDomain;
  driftType: "gradual_decline" | "sudden_drop" | "plateau_low" | "volatility";
  magnitude: number;        // 0-100
  durationDays: number;
  weeklyScores: number[];
  narrative: string;
  preemptiveSuggestion: string;
}

export interface DriftAssessment {
  drifts: DriftSignal[];
  overallDriftScore: number;   // 0 = no drift, 100 = severe
  isPreClinical: boolean;      // drift detected before clinical symptoms
  narrative: string;
  recommendedActions: string[];
}

export function useLifestyleDriftDetector() {
  const detect = useCallback((
    weeklySnapshots: { week: number; domain: HealthDomain; score: number }[]
  ): DriftAssessment => {
    const drifts: DriftSignal[] = [];
    const recommendedActions: string[] = [];

    // Group by domain
    const byDomain = new Map<HealthDomain, { week: number; score: number }[]>();
    for (const snap of weeklySnapshots) {
      const list = byDomain.get(snap.domain) || [];
      list.push({ week: snap.week, score: snap.score });
      byDomain.set(snap.domain, list.sort((a, b) => a.week - b.week));
    }

    for (const [domain, weeks] of byDomain) {
      if (weeks.length < 3) continue;

      const scores = weeks.map(w => w.score);
      const recent = scores.slice(-3);
      const earlier = scores.slice(0, Math.max(1, scores.length - 3));

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      const decline = earlierAvg - recentAvg;

      // Gradual decline
      if (decline > 10 && isMonotonicDecline(scores.slice(-4))) {
        drifts.push({
          domain, driftType: "gradual_decline",
          magnitude: Math.min(100, Math.round(decline * 2)),
          durationDays: weeks.length * 7,
          weeklyScores: scores,
          narrative: `${formatDomain(domain)} has been gradually declining over the past ${weeks.length} weeks (from ~${Math.round(earlierAvg)} to ~${Math.round(recentAvg)}).`,
          preemptiveSuggestion: getDriftSuggestion(domain, "gradual_decline"),
        });
        recommendedActions.push(getDriftSuggestion(domain, "gradual_decline"));
      }

      // Sudden drop
      if (scores.length >= 2) {
        const lastTwo = scores.slice(-2);
        if (lastTwo[0] - lastTwo[1] > 20) {
          drifts.push({
            domain, driftType: "sudden_drop",
            magnitude: Math.min(100, Math.round((lastTwo[0] - lastTwo[1]) * 2)),
            durationDays: 7,
            weeklyScores: scores,
            narrative: `${formatDomain(domain)} dropped significantly this week (${lastTwo[0]} → ${lastTwo[1]}).`,
            preemptiveSuggestion: getDriftSuggestion(domain, "sudden_drop"),
          });
        }
      }

      // Plateau at low level
      if (recentAvg < 40 && Math.abs(recent[0] - recent[recent.length - 1]) < 5) {
        drifts.push({
          domain, driftType: "plateau_low",
          magnitude: Math.round(60 - recentAvg),
          durationDays: recent.length * 7,
          weeklyScores: scores,
          narrative: `${formatDomain(domain)} has plateaued at a low level (~${Math.round(recentAvg)}/100) for ${recent.length} weeks.`,
          preemptiveSuggestion: getDriftSuggestion(domain, "plateau_low"),
        });
      }

      // High volatility
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - recentAvg, 2), 0) / scores.length;
      if (variance > 300 && scores.length >= 4) {
        drifts.push({
          domain, driftType: "volatility",
          magnitude: Math.min(100, Math.round(Math.sqrt(variance))),
          durationDays: scores.length * 7,
          weeklyScores: scores,
          narrative: `${formatDomain(domain)} has been highly variable — swinging between highs and lows without stabilizing.`,
          preemptiveSuggestion: "Consistency is key. Focus on maintaining steady habits rather than dramatic changes.",
        });
      }
    }

    const overallDriftScore = drifts.length === 0
      ? 0
      : Math.min(100, Math.round(drifts.reduce((s, d) => s + d.magnitude, 0) / drifts.length));

    const isPreClinical = drifts.some(d =>
      d.driftType === "gradual_decline" && d.magnitude > 30 && d.magnitude < 70
    );

    let narrative: string;
    if (drifts.length === 0) {
      narrative = "No significant lifestyle drift detected. Your health habits appear stable.";
    } else if (isPreClinical) {
      narrative = `We've noticed gradual changes in ${drifts.length} area${drifts.length > 1 ? "s" : ""} of your lifestyle. These aren't yet at concerning levels, but catching them early gives you the chance to course-correct.`;
    } else if (overallDriftScore > 60) {
      narrative = "Several lifestyle indicators are showing notable shifts. Focusing on stabilizing even one area can create positive momentum across the others.";
    } else {
      narrative = "Minor lifestyle fluctuations detected — these are normal. We'll keep monitoring for any sustained patterns.";
    }

    return { drifts, overallDriftScore, isPreClinical, narrative, recommendedActions };
  }, []);

  return { detect };
}

function isMonotonicDecline(scores: number[]): boolean {
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[i - 1] + 3) return false;
  }
  return true;
}

function formatDomain(domain: HealthDomain): string {
  const labels: Record<string, string> = {
    sleep: "Sleep quality", activity: "Activity levels", emotional: "Emotional wellbeing",
    nutrition: "Nutrition", wellness: "Overall wellness", recovery: "Recovery",
    wearable: "Wearable metrics", medication: "Medication adherence",
    disease_intelligence: "Health monitoring", coaching: "Coaching engagement",
    preventive: "Preventive health",
  };
  return labels[domain] || domain;
}

function getDriftSuggestion(domain: HealthDomain, driftType: string): string {
  const suggestions: Record<string, Record<string, string>> = {
    sleep: {
      gradual_decline: "Re-establish your sleep routine — consistency is the most powerful sleep aid.",
      sudden_drop: "Something may have disrupted your sleep recently. Identify the change and address it.",
      plateau_low: "Chronically poor sleep needs targeted intervention — consider reviewing your sleep environment.",
    },
    activity: {
      gradual_decline: "Activity often declines gradually without notice. Start with just 10 minutes of movement today.",
      sudden_drop: "A sudden drop in activity may signal illness, injury, or mood changes. Check in with yourself.",
      plateau_low: "Breaking out of low activity starts with tiny steps — a short walk, stretching, or stairs.",
    },
    emotional: {
      gradual_decline: "Emotional wellbeing can erode slowly. Reconnecting with activities you enjoy can help.",
      sudden_drop: "A sudden emotional shift deserves attention. Reach out to someone you trust.",
      plateau_low: "Sustained low mood may benefit from professional support — there's no shame in asking for help.",
    },
    nutrition: {
      gradual_decline: "Small nutrition improvements compound quickly. Focus on adding one nutritious meal per day.",
      sudden_drop: "Nutrition changes often follow stress or schedule changes. Try to maintain at least regular meals.",
      plateau_low: "Consistent nutrition is foundational. Even basic meal planning can make a difference.",
    },
  };
  return suggestions[domain]?.[driftType] || "Focus on small, consistent improvements in this area.";
}
