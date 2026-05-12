/**
 * PreventiveIntelligenceEngine — Core preventive reasoning engine that
 * shifts the platform from reactive symptom investigation toward proactive
 * health monitoring. Detects early warning signals across all domains.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface PreventiveAlert {
  id: string;
  category: "burnout" | "lifestyle_drift" | "chronic_risk" | "sleep_debt" |
    "stress_accumulation" | "recovery_instability" | "fatigue_pattern";
  severity: "watch" | "attention" | "warning" | "urgent";
  title: string;
  narrative: string;
  contributingDomains: HealthDomain[];
  confidence: number;       // 0-100
  detectedAt: number;
  actionable: boolean;
  suggestions: string[];
  timeHorizon: "days" | "weeks" | "months";
}

export interface PreventiveAssessment {
  alerts: PreventiveAlert[];
  overallPreventiveScore: number;    // 0-100
  riskProfile: "low" | "moderate" | "elevated" | "high";
  proactiveNarrative: string;
  nextRecommendedCheck: number;      // timestamp
  focusAreas: { domain: HealthDomain; reason: string }[];
}

export function usePreventiveIntelligence() {
  const assess = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    historyContext?: { daysOfData: number; recentTrends: Record<string, string> }
  ): PreventiveAssessment => {
    const alerts: PreventiveAlert[] = [];
    const focusAreas: { domain: HealthDomain; reason: string }[] = [];
    const get = (d: HealthDomain) => signals.get(d);

    // ═══ 1. Sleep Debt Detection ═══
    const sleep = get("sleep");
    if (sleep && sleep.score < 40 && (sleep.trend === "declining" || sleep.trend === "stable")) {
      alerts.push({
        id: `prev-sleep-debt-${Date.now()}`,
        category: "sleep_debt",
        severity: sleep.score < 25 ? "warning" : "attention",
        title: "Sleep Debt Accumulating",
        narrative: "Your sleep quality has been consistently low. Sleep debt accumulates over time and can affect energy, mood, immunity, and cognitive function.",
        contributingDomains: ["sleep"],
        confidence: 70,
        detectedAt: Date.now(),
        actionable: true,
        suggestions: [
          "Aim for a consistent bedtime — even 30 minutes earlier can help.",
          "Create a wind-down routine to signal your body it's time to rest.",
          "Limit caffeine after noon and reduce screen time before bed.",
        ],
        timeHorizon: "days",
      });
      focusAreas.push({ domain: "sleep", reason: "Accumulated sleep debt" });
    }

    // ═══ 2. Stress Accumulation ═══
    const emotional = get("emotional");
    if (emotional && emotional.score < 35) {
      alerts.push({
        id: `prev-stress-${Date.now()}`,
        category: "stress_accumulation",
        severity: emotional.score < 20 ? "warning" : "attention",
        title: "Sustained Stress Detected",
        narrative: "Your stress indicators have been elevated. Chronic stress affects sleep, immunity, and recovery. Addressing it early prevents compounding effects.",
        contributingDomains: ["emotional"],
        confidence: 65,
        detectedAt: Date.now(),
        actionable: true,
        suggestions: [
          "Short breathing exercises (4-7-8 technique) can reduce acute stress.",
          "Brief daily walks — even 10 minutes — significantly lower stress hormones.",
          "Consider speaking with someone you trust about what's on your mind.",
        ],
        timeHorizon: "days",
      });
      focusAreas.push({ domain: "emotional", reason: "Sustained high stress" });
    }

    // ═══ 3. Fatigue Pattern ═══
    const activity = get("activity");
    if (sleep && activity && sleep.score < 45 && activity.score < 35) {
      alerts.push({
        id: `prev-fatigue-${Date.now()}`,
        category: "fatigue_pattern",
        severity: "attention",
        title: "Fatigue Pattern Emerging",
        narrative: "The combination of poor sleep and low activity suggests a fatigue pattern. This can become self-reinforcing if not addressed.",
        contributingDomains: ["sleep", "activity"],
        confidence: 60,
        detectedAt: Date.now(),
        actionable: true,
        suggestions: [
          "Start with gentle activity — even a short walk can break the fatigue cycle.",
          "Prioritize sleep quality over quantity — consistency matters most.",
        ],
        timeHorizon: "weeks",
      });
    }

    // ═══ 4. Recovery Instability ═══
    const recovery = get("recovery");
    if (recovery && recovery.trend === "declining" && recovery.score < 50) {
      alerts.push({
        id: `prev-recovery-${Date.now()}`,
        category: "recovery_instability",
        severity: recovery.score < 30 ? "warning" : "attention",
        title: "Recovery Progress Stalling",
        narrative: "Your recovery trajectory has slowed or reversed. This may be influenced by sleep, medication adherence, or activity levels.",
        contributingDomains: ["recovery", "sleep", "medication"],
        confidence: 60,
        detectedAt: Date.now(),
        actionable: true,
        suggestions: [
          "Ensure medication consistency — gaps can interrupt recovery momentum.",
          "Avoid overexertion during recovery periods.",
          "Rest is an active part of recovery, not a passive one.",
        ],
        timeHorizon: "days",
      });
      focusAreas.push({ domain: "recovery", reason: "Declining recovery trajectory" });
    }

    // ═══ 5. Compound Burnout Risk ═══
    if (sleep && emotional && activity) {
      const burnoutScore = ((100 - sleep.score) * 0.35 + (100 - emotional.score) * 0.40 + (100 - activity.score) * 0.25);
      if (burnoutScore > 65) {
        alerts.push({
          id: `prev-burnout-${Date.now()}`,
          category: "burnout",
          severity: burnoutScore > 80 ? "urgent" : "warning",
          title: "Burnout Risk Elevated",
          narrative: "Multiple indicators — poor sleep, high stress, and low activity — suggest increasing burnout risk. Early intervention is key.",
          contributingDomains: ["sleep", "emotional", "activity"],
          confidence: 70,
          detectedAt: Date.now(),
          actionable: true,
          suggestions: [
            "Consider reducing non-essential commitments temporarily.",
            "Protect your sleep schedule — it's the foundation of recovery from burnout.",
            "Even brief moments of rest and enjoyment throughout the day help.",
          ],
          timeHorizon: "weeks",
        });
      }
    }

    // ═══ Compute Overall Score ═══
    const domainScores = [...signals.values()].map(s => s.score);
    const avgScore = domainScores.length > 0
      ? Math.round(domainScores.reduce((a, b) => a + b, 0) / domainScores.length)
      : 50;
    const alertPenalty = alerts.reduce((sum, a) => {
      const penalties = { watch: 2, attention: 5, warning: 10, urgent: 15 };
      return sum + penalties[a.severity];
    }, 0);
    const overallPreventiveScore = Math.max(0, Math.min(100, avgScore - alertPenalty));

    let riskProfile: PreventiveAssessment["riskProfile"];
    if (overallPreventiveScore >= 70) riskProfile = "low";
    else if (overallPreventiveScore >= 50) riskProfile = "moderate";
    else if (overallPreventiveScore >= 30) riskProfile = "elevated";
    else riskProfile = "high";

    // Narrative
    const narrativeMap: Record<string, string> = {
      low: "Your preventive health outlook is positive. Continue your current habits — they're working well.",
      moderate: "Your health is generally stable, with a few areas worth monitoring. Small adjustments now prevent larger issues later.",
      elevated: "Several preventive indicators need attention. Taking action on even one area can create positive ripple effects across your health.",
      high: "Your preventive health indicators suggest this is an important time for self-care. Let's focus on the most impactful changes.",
    };

    // Next check timing
    const checkIntervals: Record<string, number> = { low: 7, moderate: 3, elevated: 1, high: 1 };
    const nextRecommendedCheck = Date.now() + checkIntervals[riskProfile] * 86_400_000;

    return {
      alerts: alerts.sort((a, b) => {
        const severityOrder = { urgent: 0, warning: 1, attention: 2, watch: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      overallPreventiveScore,
      riskProfile,
      proactiveNarrative: narrativeMap[riskProfile],
      nextRecommendedCheck,
      focusAreas,
    };
  }, []);

  return { assess };
}
