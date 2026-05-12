/**
 * PreventiveHealthNarratives — Generates narrative stories that help users
 * understand preventive health signals. Translates data patterns into
 * relatable, emotionally safe stories that motivate proactive behavior.
 */
import { useCallback } from "react";
import type { HealthDomain } from "../UnifiedHealthEngine";
import type { PreventiveAlert } from "../preventive/PreventiveIntelligenceEngine";

export interface HealthNarrative {
  id: string;
  title: string;
  story: string;
  theme: "awareness" | "encouragement" | "gentle_warning" | "celebration" | "reflection";
  relatedDomains: HealthDomain[];
  visualMetaphor: string;    // emoji or short visual cue
  readingTime: string;       // "30 sec", "1 min"
}

export function usePreventiveHealthNarratives() {
  const generateNarratives = useCallback((
    alerts: PreventiveAlert[],
    overallScore: number,
    overallTrend: string
  ): HealthNarrative[] => {
    const narratives: HealthNarrative[] = [];

    // ── Positive Momentum ──
    if (overallScore > 70 && overallTrend === "improving") {
      narratives.push({
        id: "narr-positive-momentum",
        title: "Building Momentum",
        story: "Your health indicators are like a garden that's starting to bloom. The seeds of consistent habits you've been planting — better sleep, regular movement, mindful eating — are showing results. This is what sustainable health looks like: not dramatic overnight changes, but steady, compounding improvements across multiple dimensions.",
        theme: "celebration",
        relatedDomains: ["wellness"],
        visualMetaphor: "🌱",
        readingTime: "30 sec",
      });
    }

    // ── Sleep Debt Story ──
    const sleepAlert = alerts.find(a => a.category === "sleep_debt");
    if (sleepAlert) {
      narratives.push({
        id: "narr-sleep-debt",
        title: "The Sleep Account",
        story: "Think of sleep like a bank account. Every night of poor sleep is a withdrawal, and your body keeps a running balance. The good news? Unlike financial debt, sleep debt can be addressed relatively quickly. A few nights of consistent, quality rest can start restoring your balance. Your body wants to heal — it just needs the right conditions.",
        theme: "awareness",
        relatedDomains: ["sleep"],
        visualMetaphor: "🏦",
        readingTime: "30 sec",
      });
    }

    // ── Burnout Prevention ──
    const burnoutAlert = alerts.find(a => a.category === "burnout");
    if (burnoutAlert) {
      narratives.push({
        id: "narr-burnout-canary",
        title: "Listening to Your Body",
        story: "Your body is sending signals — elevated stress, disrupted sleep, decreased energy. These aren't failures; they're your body's early warning system doing exactly what it should. Burnout doesn't happen overnight; it builds gradually from sustained imbalance. The fact that we're catching these signals now means there's still time to adjust course. Even one small act of self-care today can interrupt the pattern.",
        theme: "gentle_warning",
        relatedDomains: ["emotional", "sleep", "activity"],
        visualMetaphor: "🕯️",
        readingTime: "45 sec",
      });
    }

    // ── Stress-Sleep Cycle ──
    const stressAlert = alerts.find(a => a.category === "stress_accumulation");
    if (stressAlert && sleepAlert) {
      narratives.push({
        id: "narr-cycle-breaking",
        title: "Breaking the Cycle",
        story: "Stress and poor sleep often feed each other in a loop: stress makes it hard to sleep, and poor sleep makes everything feel more stressful. But here's what many people don't realize — you only need to break the cycle at ONE point for both to start improving. A 10-minute wind-down routine before bed, or a 5-minute breathing exercise during the day, can be the wedge that disrupts the pattern.",
        theme: "awareness",
        relatedDomains: ["sleep", "emotional"],
        visualMetaphor: "🔄",
        readingTime: "30 sec",
      });
    }

    // ── Recovery Companion ──
    const recoveryAlert = alerts.find(a => a.category === "recovery_instability");
    if (recoveryAlert) {
      narratives.push({
        id: "narr-recovery-patience",
        title: "Recovery Isn't Linear",
        story: "If your recovery feels like it's stalled or going backwards, know this: recovery is rarely a straight line. There are plateaus, small setbacks, and frustrating days. But these don't erase the progress you've made. Your body is constantly working toward balance. Focus on what you can control — rest, medication consistency, gentle movement — and trust the process.",
        theme: "encouragement",
        relatedDomains: ["recovery"],
        visualMetaphor: "📈",
        readingTime: "30 sec",
      });
    }

    // ── General Preventive Awareness ──
    if (alerts.length === 0) {
      narratives.push({
        id: "narr-steady-state",
        title: "The Power of Consistency",
        story: "No alerts right now — and that's worth celebrating. Consistent healthy habits are like compound interest for your body. The daily choices that feel routine are actually building long-term resilience. Keep showing up for yourself in the small ways, and your health will continue to compound in your favor.",
        theme: "celebration",
        relatedDomains: ["preventive", "wellness"],
        visualMetaphor: "🏔️",
        readingTime: "30 sec",
      });
    }

    return narratives;
  }, []);

  return { generateNarratives };
}
