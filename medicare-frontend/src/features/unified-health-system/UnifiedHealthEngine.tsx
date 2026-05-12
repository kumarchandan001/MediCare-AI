/**
 * UnifiedHealthEngine — Core engine that merges signals from all health
 * domains (disease, wearable, recovery, sleep, activity, nutrition,
 * medication, wellness, coaching, preventive) into a single UnifiedHealthState.
 * 
 * This is the "brain" of the Unified Personal Health Operating System.
 * It does NOT render UI — it computes cross-domain health intelligence.
 */
import { useCallback } from "react";

// ── Domain Signal Types ──────────────────
export interface DomainSignal {
  domain: HealthDomain;
  score: number;          // 0-100
  trend: "improving" | "stable" | "declining" | "unknown";
  confidence: number;     // 0-100
  lastUpdated: number;
  alerts: DomainAlert[];
  metadata?: Record<string, unknown>;
}

export type HealthDomain =
  | "disease_intelligence"
  | "wearable"
  | "recovery"
  | "sleep"
  | "activity"
  | "nutrition"
  | "medication"
  | "wellness"
  | "coaching"
  | "preventive"
  | "emotional";

export interface DomainAlert {
  level: "info" | "attention" | "warning" | "urgent";
  message: string;
  domain: HealthDomain;
  actionable: boolean;
  timestamp: number;
}

// ── Unified Health State ─────────────────
export interface UnifiedHealthState {
  overallScore: number;       // 0-100 composite health score
  overallTrend: "improving" | "stable" | "declining" | "insufficient_data";
  domainSignals: Map<HealthDomain, DomainSignal>;
  activeDomains: HealthDomain[];
  crossDomainInsights: CrossDomainInsight[];
  healthNarrative: string;
  activeAlerts: DomainAlert[];
  lastComputed: number;
}

export interface CrossDomainInsight {
  id: string;
  sourceDomains: HealthDomain[];
  insight: string;
  impact: "positive" | "neutral" | "negative";
  confidence: number;
  actionSuggestion?: string;
}

// ── Domain Weight Configuration ──────────
const DOMAIN_WEIGHTS: Record<HealthDomain, number> = {
  disease_intelligence: 0.20,
  wearable: 0.10,
  recovery: 0.12,
  sleep: 0.12,
  activity: 0.10,
  nutrition: 0.08,
  medication: 0.08,
  wellness: 0.08,
  coaching: 0.04,
  preventive: 0.06,
  emotional: 0.02,
};

export function useUnifiedHealthEngine() {
  /**
   * Compute unified health state from individual domain signals.
   */
  const computeUnifiedState = useCallback((
    signals: DomainSignal[]
  ): UnifiedHealthState => {
    const domainSignals = new Map<HealthDomain, DomainSignal>();
    const activeDomains: HealthDomain[] = [];
    const activeAlerts: DomainAlert[] = [];

    // Index signals
    for (const signal of signals) {
      domainSignals.set(signal.domain, signal);
      activeDomains.push(signal.domain);
      activeAlerts.push(...signal.alerts);
    }

    // Compute weighted overall score
    let weightedSum = 0;
    let totalWeight = 0;
    for (const signal of signals) {
      const weight = DOMAIN_WEIGHTS[signal.domain] || 0.05;
      weightedSum += signal.score * weight * (signal.confidence / 100);
      totalWeight += weight * (signal.confidence / 100);
    }
    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;

    // Determine overall trend
    const trends = signals.map(s => s.trend);
    const improvingCount = trends.filter(t => t === "improving").length;
    const decliningCount = trends.filter(t => t === "declining").length;
    let overallTrend: UnifiedHealthState["overallTrend"];
    if (signals.length < 2) overallTrend = "insufficient_data";
    else if (improvingCount > decliningCount * 2) overallTrend = "improving";
    else if (decliningCount > improvingCount * 2) overallTrend = "declining";
    else overallTrend = "stable";

    // Generate cross-domain insights
    const crossDomainInsights = detectCrossDomainInsights(domainSignals);

    // Generate narrative
    const healthNarrative = generateHealthNarrative(overallScore, overallTrend, activeDomains.length, activeAlerts);

    return {
      overallScore,
      overallTrend,
      domainSignals,
      activeDomains,
      crossDomainInsights,
      healthNarrative,
      activeAlerts: activeAlerts.sort((a, b) => {
        const levels = { urgent: 0, warning: 1, attention: 2, info: 3 };
        return levels[a.level] - levels[b.level];
      }),
      lastComputed: Date.now(),
    };
  }, []);

  /**
   * Get a domain's influence on another domain.
   */
  const getDomainInfluence = useCallback((
    source: HealthDomain,
    target: HealthDomain,
    signals: Map<HealthDomain, DomainSignal>
  ): number => {
    const sourceSignal = signals.get(source);
    if (!sourceSignal) return 0;

    // Influence matrix (simplified — how much source affects target)
    const influenceMap: Partial<Record<HealthDomain, Partial<Record<HealthDomain, number>>>> = {
      sleep: { recovery: 0.7, activity: 0.5, wellness: 0.6, emotional: 0.6 },
      activity: { recovery: 0.5, sleep: 0.4, wellness: 0.5 },
      recovery: { disease_intelligence: 0.6, wellness: 0.5, activity: 0.3 },
      medication: { recovery: 0.6, disease_intelligence: 0.4 },
      emotional: { sleep: 0.4, wellness: 0.5, recovery: 0.3 },
      wearable: { disease_intelligence: 0.3, recovery: 0.2, activity: 0.4 },
    };

    const influence = influenceMap[source]?.[target] || 0;
    // Normalize influence by source score deviation from baseline (50)
    const deviation = (sourceSignal.score - 50) / 50;
    return influence * deviation;
  }, []);

  return { computeUnifiedState, getDomainInfluence };
}

// ── Internal Helpers ─────────────────────
function detectCrossDomainInsights(signals: Map<HealthDomain, DomainSignal>): CrossDomainInsight[] {
  const insights: CrossDomainInsight[] = [];

  const sleep = signals.get("sleep");
  const recovery = signals.get("recovery");
  const activity = signals.get("activity");
  const emotional = signals.get("emotional");
  const medication = signals.get("medication");

  // Sleep-Recovery interaction
  if (sleep && recovery) {
    if (sleep.score < 40 && recovery.trend === "declining") {
      insights.push({
        id: "sleep-recovery-decline",
        sourceDomains: ["sleep", "recovery"],
        insight: "Poor sleep quality appears to be slowing your recovery. Rest quality is a key factor in healing.",
        impact: "negative",
        confidence: 75,
        actionSuggestion: "Consider prioritizing sleep hygiene — consistent bedtime, reduced screen time, and a cool environment.",
      });
    }
    if (sleep.score > 70 && recovery.trend === "improving") {
      insights.push({
        id: "sleep-recovery-positive",
        sourceDomains: ["sleep", "recovery"],
        insight: "Your improved sleep quality is supporting a healthy recovery trajectory.",
        impact: "positive",
        confidence: 70,
      });
    }
  }

  // Activity-Recovery balance
  if (activity && recovery) {
    if (activity.score > 80 && recovery.score < 50) {
      insights.push({
        id: "activity-recovery-overexertion",
        sourceDomains: ["activity", "recovery"],
        insight: "High activity levels during recovery may be counterproductive. Consider gentler activity until recovery stabilizes.",
        impact: "negative",
        confidence: 65,
        actionSuggestion: "Reduce exercise intensity and allow your body more time to recover.",
      });
    }
  }

  // Emotional-Sleep correlation
  if (emotional && sleep) {
    if (emotional.score < 40 && sleep.score < 40) {
      insights.push({
        id: "emotional-sleep-feedback",
        sourceDomains: ["emotional", "sleep"],
        insight: "Elevated stress and poor sleep can create a reinforcing cycle. Addressing either may help improve both.",
        impact: "negative",
        confidence: 70,
        actionSuggestion: "Consider relaxation techniques before bed, and reach out for support if stress feels overwhelming.",
      });
    }
  }

  // Medication-Recovery correlation
  if (medication && recovery) {
    if (medication.score < 50 && recovery.trend === "declining") {
      insights.push({
        id: "medication-recovery-adherence",
        sourceDomains: ["medication", "recovery"],
        insight: "Inconsistent medication adherence may be affecting your recovery progress.",
        impact: "negative",
        confidence: 60,
        actionSuggestion: "Try setting medication reminders. Consistent adherence supports steady recovery.",
      });
    }
  }

  return insights;
}

function generateHealthNarrative(
  score: number, trend: string, domainCount: number, alerts: DomainAlert[]
): string {
  const urgentAlerts = alerts.filter(a => a.level === "urgent" || a.level === "warning");

  if (domainCount < 2) {
    return "We're just getting to know your health picture. As more data comes in, your insights will become richer and more personalized.";
  }

  if (urgentAlerts.length > 0) {
    return `Your overall health picture shows areas that need attention. ${urgentAlerts.length} alert${urgentAlerts.length > 1 ? "s" : ""} require${urgentAlerts.length === 1 ? "s" : ""} your awareness. We're monitoring closely.`;
  }

  if (score >= 75 && trend === "improving") {
    return "Your health picture looks strong across multiple dimensions. Key indicators are trending positively, and your wellness systems are well-balanced.";
  }

  if (score >= 60) {
    return "Your overall health is in a good place. A few areas could benefit from attention, but the big picture is encouraging.";
  }

  if (trend === "declining") {
    return "Some of your health indicators have been trending downward recently. Let's look at what might be contributing and what adjustments could help.";
  }

  return "Your health picture is building. We're tracking several dimensions and will share deeper insights as patterns emerge.";
}
