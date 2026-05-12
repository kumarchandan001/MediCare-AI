/**
 * MultiDomainHealthFusion — Fuses signals from all health domains into
 * a single FusedHealthProfile — a unified snapshot of the user's overall
 * health state. Used by the command center and companion for holistic
 * understanding.
 */
import { useCallback } from "react";
import type { DomainSignal, HealthDomain, CrossDomainInsight } from "../UnifiedHealthEngine";

export interface FusedHealthProfile {
  // Core composite scores
  physicalHealth: number;        // 0-100
  mentalWellbeing: number;       // 0-100
  recoveryStatus: number;        // 0-100
  lifestyleBalance: number;      // 0-100
  preventiveReadiness: number;   // 0-100

  // Composite trend
  overallTrajectory: "thriving" | "steady" | "needs_attention" | "at_risk" | "insufficient_data";

  // Domain coverage
  dataRichness: number;          // 0-100, how much data we have
  activeDomainCount: number;
  missingDomains: HealthDomain[];

  // Risk profile
  primaryRisks: FusedRisk[];
  primaryStrengths: FusedStrength[];

  // Narrative
  holisticNarrative: string;
  focusAreas: FocusArea[];
}

export interface FusedRisk {
  label: string;
  severity: "low" | "moderate" | "elevated" | "high";
  contributingDomains: HealthDomain[];
  trend: "worsening" | "stable" | "improving";
  narrative: string;
}

export interface FusedStrength {
  label: string;
  strength: number;    // 0-100
  contributingDomains: HealthDomain[];
  narrative: string;
}

export interface FocusArea {
  domain: HealthDomain;
  priority: "primary" | "secondary" | "background";
  reason: string;
  actionableInsight: string;
}

const ALL_DOMAINS: HealthDomain[] = [
  "disease_intelligence", "wearable", "recovery", "sleep",
  "activity", "nutrition", "medication", "wellness",
  "coaching", "preventive", "emotional",
];

export function useMultiDomainHealthFusion() {
  const fuse = useCallback((signals: Map<HealthDomain, DomainSignal>): FusedHealthProfile => {
    const get = (d: HealthDomain) => signals.get(d);
    const score = (d: HealthDomain) => get(d)?.score ?? -1;
    const has = (d: HealthDomain) => signals.has(d);

    const activeDomainCount = signals.size;
    const missingDomains = ALL_DOMAINS.filter(d => !has(d));
    const dataRichness = Math.round((activeDomainCount / ALL_DOMAINS.length) * 100);

    // ── Physical Health Composite ──
    const physicalInputs = [score("activity"), score("wearable"), score("recovery")]
      .filter(s => s >= 0);
    const physicalHealth = physicalInputs.length > 0
      ? Math.round(physicalInputs.reduce((a, b) => a + b, 0) / physicalInputs.length)
      : 50;

    // ── Mental Wellbeing Composite ──
    const mentalInputs = [score("emotional"), score("wellness"), score("coaching")]
      .filter(s => s >= 0);
    const mentalWellbeing = mentalInputs.length > 0
      ? Math.round(mentalInputs.reduce((a, b) => a + b, 0) / mentalInputs.length)
      : 50;

    // ── Recovery Status ──
    const recoveryStatus = has("recovery")
      ? score("recovery")
      : physicalHealth > 60 ? 65 : 45;

    // ── Lifestyle Balance ──
    const lifestyleInputs = [score("sleep"), score("activity"), score("nutrition"), score("emotional")]
      .filter(s => s >= 0);
    const lifestyleBalance = lifestyleInputs.length > 0
      ? Math.round(lifestyleInputs.reduce((a, b) => a + b, 0) / lifestyleInputs.length)
      : 50;

    // ── Preventive Readiness ──
    const preventiveInputs = [score("preventive"), score("wellness"), score("wearable")]
      .filter(s => s >= 0);
    const preventiveReadiness = preventiveInputs.length > 0
      ? Math.round(preventiveInputs.reduce((a, b) => a + b, 0) / preventiveInputs.length)
      : 40;

    // ── Overall Trajectory ──
    let overallTrajectory: FusedHealthProfile["overallTrajectory"];
    if (activeDomainCount < 3) {
      overallTrajectory = "insufficient_data";
    } else {
      const compositeAvg = (physicalHealth + mentalWellbeing + lifestyleBalance) / 3;
      const decliningDomains = [...signals.values()].filter(s => s.trend === "declining").length;
      const improvingDomains = [...signals.values()].filter(s => s.trend === "improving").length;

      if (compositeAvg >= 75 && decliningDomains === 0) overallTrajectory = "thriving";
      else if (compositeAvg >= 55 && decliningDomains <= 1) overallTrajectory = "steady";
      else if (decliningDomains >= 3 || compositeAvg < 35) overallTrajectory = "at_risk";
      else overallTrajectory = "needs_attention";
    }

    // ── Risks ──
    const primaryRisks: FusedRisk[] = [];

    if (score("sleep") >= 0 && score("sleep") < 40 && score("emotional") >= 0 && score("emotional") < 40) {
      primaryRisks.push({
        label: "Stress-Sleep Cycle", severity: "elevated",
        contributingDomains: ["sleep", "emotional"], trend: "stable",
        narrative: "Both sleep and stress indicators are concerning — they may be reinforcing each other.",
      });
    }
    if (score("activity") >= 0 && score("activity") < 30) {
      primaryRisks.push({
        label: "Low Activity", severity: "moderate",
        contributingDomains: ["activity"], trend: get("activity")?.trend === "declining" ? "worsening" : "stable",
        narrative: "Activity levels are notably low, which can affect energy, mood, and recovery.",
      });
    }
    if (score("medication") >= 0 && score("medication") < 40 && has("recovery")) {
      primaryRisks.push({
        label: "Medication Adherence Gap", severity: "moderate",
        contributingDomains: ["medication", "recovery"], trend: "stable",
        narrative: "Inconsistent medication may be affecting recovery progress.",
      });
    }

    // ── Strengths ──
    const primaryStrengths: FusedStrength[] = [];

    if (score("sleep") > 70) {
      primaryStrengths.push({
        label: "Strong Sleep", strength: score("sleep"),
        contributingDomains: ["sleep"],
        narrative: "Your sleep quality is a significant health asset, supporting recovery and resilience.",
      });
    }
    if (score("activity") > 70) {
      primaryStrengths.push({
        label: "Active Lifestyle", strength: score("activity"),
        contributingDomains: ["activity"],
        narrative: "Your activity level supports cardiovascular health, mood, and overall resilience.",
      });
    }
    if (score("emotional") > 70) {
      primaryStrengths.push({
        label: "Emotional Stability", strength: score("emotional"),
        contributingDomains: ["emotional"],
        narrative: "Your emotional wellbeing is strong — this supports clear thinking and healthy habits.",
      });
    }

    // ── Focus Areas ──
    const focusAreas: FocusArea[] = [];
    const sortedDomains = [...signals.entries()]
      .sort(([, a], [, b]) => a.score - b.score);

    for (const [domain, signal] of sortedDomains.slice(0, 3)) {
      if (signal.score < 50) {
        focusAreas.push({
          domain,
          priority: signal.score < 30 ? "primary" : "secondary",
          reason: `${formatDomainLabel(domain)} is below optimal (${signal.score}/100)`,
          actionableInsight: getActionableInsight(domain, signal.score),
        });
      }
    }

    // ── Holistic Narrative ──
    const trajectoryNarratives: Record<string, string> = {
      thriving: "Your health picture looks excellent across the board. Multiple systems are working together effectively, and your lifestyle choices are paying off.",
      steady: "Your health is in a good place overall. There are always areas to fine-tune, but the foundation is solid.",
      needs_attention: "Some areas of your health could benefit from focused attention. Small, consistent changes in key areas can lead to meaningful improvements.",
      at_risk: "Several health indicators suggest this is a time to be intentional about self-care. Let's identify the most impactful adjustments you can make.",
      insufficient_data: "We're still building your complete health picture. As more data comes in from different sources, your insights will become richer and more personalized.",
    };

    return {
      physicalHealth, mentalWellbeing, recoveryStatus, lifestyleBalance, preventiveReadiness,
      overallTrajectory,
      dataRichness, activeDomainCount, missingDomains,
      primaryRisks, primaryStrengths,
      holisticNarrative: trajectoryNarratives[overallTrajectory],
      focusAreas,
    };
  }, []);

  return { fuse };
}

function formatDomainLabel(domain: HealthDomain): string {
  const labels: Record<string, string> = {
    disease_intelligence: "Disease Intelligence", wearable: "Wearable Data",
    recovery: "Recovery", sleep: "Sleep", activity: "Activity",
    nutrition: "Nutrition", medication: "Medication", wellness: "Wellness",
    coaching: "Coaching", preventive: "Preventive Health", emotional: "Emotional Wellbeing",
  };
  return labels[domain] || domain;
}

function getActionableInsight(domain: HealthDomain, score: number): string {
  const insights: Record<string, string> = {
    sleep: "Small changes like consistent bedtimes and reducing screen time before bed can significantly improve sleep quality.",
    activity: "Start with just 10-15 minutes of gentle movement daily — consistency matters more than intensity.",
    emotional: "Consider simple stress-relief practices: deep breathing, short walks, or talking with someone you trust.",
    nutrition: "Focus on adding nutritious foods rather than restricting — small additions compound over time.",
    medication: "Setting daily reminders can help maintain consistent adherence.",
    recovery: "Rest is active recovery — give your body the time and conditions it needs to heal.",
    wellness: "Check in with yourself regularly — awareness is the first step toward improvement.",
    wearable: "Ensure your wearable is worn consistently for more accurate health insights.",
    preventive: "Regular health check-ins, even when feeling well, help catch issues early.",
    coaching: "Engaging with health coaching can provide personalized guidance for your situation.",
    disease_intelligence: "Stay aware of your symptoms and don't hesitate to investigate changes.",
  };
  return insights[domain] || "Focus on consistent, small improvements in this area.";
}
