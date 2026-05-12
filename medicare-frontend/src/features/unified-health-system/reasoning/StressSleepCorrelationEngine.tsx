/**
 * StressSleepCorrelationEngine — Correlates stress indicators with
 * sleep quality, producing compound risk scores. Detects stress-sleep-fatigue
 * feedback loops that amplify health problems.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain } from "../UnifiedHealthEngine";

export interface StressSleepCorrelation {
  correlationStrength: number;    // 0-100
  feedbackLoopDetected: boolean;
  compoundRiskScore: number;      // 0-100
  stressContribution: number;     // 0-100
  sleepContribution: number;      // 0-100
  fatigueRisk: number;            // 0-100
  burnoutTrajectory: "stable" | "rising" | "critical" | "insufficient_data";
  narrative: string;
  interventionSuggestions: string[];
}

export interface CorrelationHistory {
  timestamp: number;
  stressScore: number;
  sleepScore: number;
  fatigueIndicator: number;
}

export function useStressSleepCorrelation() {
  const correlate = useCallback((
    signals: Map<HealthDomain, DomainSignal>,
    history?: CorrelationHistory[]
  ): StressSleepCorrelation => {
    const stress = signals.get("emotional");
    const sleep = signals.get("sleep");
    const activity = signals.get("activity");
    const recovery = signals.get("recovery");

    const stressScore = stress?.score ?? 50;
    const sleepScore = sleep?.score ?? 50;
    const activityScore = activity?.score ?? 50;

    // Invert stress score (lower emotional score = higher stress)
    const stressLevel = 100 - stressScore;
    const sleepDeficit = 100 - sleepScore;

    // ── Correlation Strength ──
    // High when both are poor — indicates a potential feedback loop
    const correlationStrength = Math.min(100, Math.round(
      (stressLevel * 0.5 + sleepDeficit * 0.5) * (stressLevel > 50 && sleepDeficit > 50 ? 1.3 : 0.8)
    ));

    // ── Feedback Loop Detection ──
    // A feedback loop exists when stress→poor sleep→more stress→worse sleep
    const feedbackLoopDetected = stressLevel > 55 && sleepDeficit > 55 && (
      stress?.trend === "declining" || sleep?.trend === "declining"
    );

    // ── Compound Risk Score ──
    const compoundRiskScore = Math.min(100, Math.round(
      stressLevel * 0.4 + sleepDeficit * 0.4 + (feedbackLoopDetected ? 20 : 0)
    ));

    // ── Fatigue Risk ──
    const activityDecline = activityScore < 40 ? 15 : 0;
    const recoveryStall = recovery && recovery.score < 40 ? 10 : 0;
    const fatigueRisk = Math.min(100, Math.round(
      sleepDeficit * 0.4 + stressLevel * 0.3 + activityDecline + recoveryStall
    ));

    // ── Burnout Trajectory ──
    let burnoutTrajectory: StressSleepCorrelation["burnoutTrajectory"];
    if (!history || history.length < 3) {
      burnoutTrajectory = "insufficient_data";
    } else {
      const recent = history.slice(-5);
      const avgRecentStress = recent.reduce((s, h) => s + (100 - h.stressScore), 0) / recent.length;
      const avgRecentSleep = recent.reduce((s, h) => s + (100 - h.sleepScore), 0) / recent.length;
      const compoundRecent = avgRecentStress * 0.5 + avgRecentSleep * 0.5;

      if (compoundRecent > 70) burnoutTrajectory = "critical";
      else if (compoundRecent > 50 && feedbackLoopDetected) burnoutTrajectory = "rising";
      else burnoutTrajectory = "stable";
    }

    // ── Narrative ──
    let narrative: string;
    const interventionSuggestions: string[] = [];

    if (feedbackLoopDetected) {
      narrative = "We're detecting a stress-sleep feedback pattern — elevated stress appears to be disrupting sleep, which in turn may be increasing stress sensitivity. Breaking this cycle, even partially, can make a significant difference.";
      interventionSuggestions.push(
        "Try a wind-down routine 30 minutes before bed — dim lights, no screens, gentle breathing.",
        "Consider journaling before sleep to offload racing thoughts.",
        "A short 10-minute walk during the day can reduce evening stress levels.",
      );
    } else if (compoundRiskScore > 60) {
      narrative = "Both stress and sleep quality are areas of concern. While they may not yet be reinforcing each other, addressing either one will likely help the other.";
      interventionSuggestions.push(
        "Focus on one area first — improving sleep often naturally reduces stress.",
        "Maintain consistent wake times, even on weekends, to stabilize your rhythm.",
      );
    } else if (stressLevel > 60 && sleepDeficit < 40) {
      narrative = "Your stress levels are elevated, but your sleep quality is holding. Maintaining good sleep will help buffer the effects of stress.";
      interventionSuggestions.push(
        "Protect your sleep routine — it's currently a protective factor.",
        "Consider brief stress-relief moments during the day.",
      );
    } else if (sleepDeficit > 60 && stressLevel < 40) {
      narrative = "Your sleep quality needs attention, though your stress levels are manageable. Improving sleep could prevent stress from building up.";
      interventionSuggestions.push(
        "Prioritize sleep environment: cool, dark, and quiet.",
        "Avoid caffeine after noon and heavy meals before bed.",
      );
    } else {
      narrative = "Your stress and sleep are in a reasonable balance. Continue maintaining healthy habits to keep this equilibrium.";
    }

    return {
      correlationStrength,
      feedbackLoopDetected,
      compoundRiskScore,
      stressContribution: stressLevel,
      sleepContribution: sleepDeficit,
      fatigueRisk,
      burnoutTrajectory,
      narrative,
      interventionSuggestions,
    };
  }, []);

  return { correlate };
}
