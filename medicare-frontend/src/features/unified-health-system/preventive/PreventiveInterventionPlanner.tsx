/**
 * PreventiveInterventionPlanner — Plans adaptive preventive interventions
 * based on detected risks. Suggests lifestyle adjustments, monitoring
 * frequency changes, and escalation timing. Interventions are supportive,
 * non-prescriptive, and emotionally safe.
 */
import { useCallback } from "react";
import type { HealthDomain } from "../UnifiedHealthEngine";
import type { PreventiveAlert } from "./PreventiveIntelligenceEngine";

export interface InterventionPlan {
  id: string;
  title: string;
  targetDomains: HealthDomain[];
  priority: "immediate" | "this_week" | "this_month" | "ongoing";
  interventions: Intervention[];
  expectedOutcome: string;
  reviewDate: number;
  adaptiveAdjustments: string[];
  narrative: string;
}

export interface Intervention {
  action: string;
  frequency: "daily" | "weekly" | "as_needed";
  difficulty: "easy" | "moderate" | "challenging";
  expectedImpact: "high" | "moderate" | "gradual";
  domain: HealthDomain;
  trackingMetric: string;
}

export interface PlannerOutput {
  plans: InterventionPlan[];
  overallStrategy: string;
  monitoringAdjustments: MonitoringAdjustment[];
  weeklyFocusArea: HealthDomain;
  encouragement: string;
}

export interface MonitoringAdjustment {
  domain: HealthDomain;
  currentFrequency: string;
  recommendedFrequency: string;
  reason: string;
}

export function usePreventiveInterventionPlanner() {
  const plan = useCallback((
    alerts: PreventiveAlert[],
    currentScores: Map<HealthDomain, number>
  ): PlannerOutput => {
    const plans: InterventionPlan[] = [];
    const monitoringAdjustments: MonitoringAdjustment[] = [];

    // ── Sort alerts by severity ──
    const sorted = [...alerts].sort((a, b) => {
      const order = { urgent: 0, warning: 1, attention: 2, watch: 3 };
      return order[a.severity] - order[b.severity];
    });

    for (const alert of sorted) {
      const interventionPlan = buildPlanForAlert(alert, currentScores);
      if (interventionPlan) plans.push(interventionPlan);

      // Adjust monitoring frequency for concerning domains
      for (const domain of alert.contributingDomains) {
        const score = currentScores.get(domain) || 50;
        if (score < 40) {
          monitoringAdjustments.push({
            domain,
            currentFrequency: "daily",
            recommendedFrequency: "twice daily",
            reason: `${formatDomain(domain)} is below 40 — closer monitoring helps track response to interventions.`,
          });
        }
      }
    }

    // ── Weekly Focus Area ──
    const lowestDomain = [...currentScores.entries()]
      .sort(([, a], [, b]) => a - b)[0];
    const weeklyFocusArea: HealthDomain = lowestDomain ? lowestDomain[0] : "wellness";

    // ── Overall Strategy ──
    let overallStrategy: string;
    if (plans.length === 0) {
      overallStrategy = "No specific interventions needed right now. Continue your current health habits — they're working.";
    } else if (plans.length === 1) {
      overallStrategy = `Focus on one key area: ${plans[0].title}. Concentrated effort on a single area often creates ripple effects across your health.`;
    } else if (plans.length <= 3) {
      overallStrategy = `We've identified ${plans.length} areas for attention. Start with the highest priority and build momentum gradually.`;
    } else {
      overallStrategy = "Several areas need attention. Don't try to tackle everything at once — pick the one that feels most achievable and start there.";
    }

    // ── Encouragement ──
    const encouragement = getEncouragement(plans.length, currentScores);

    return {
      plans: plans.slice(0, 5),  // Cap at 5 plans to avoid overwhelm
      overallStrategy,
      monitoringAdjustments,
      weeklyFocusArea,
      encouragement,
    };
  }, []);

  return { plan };
}

function buildPlanForAlert(
  alert: PreventiveAlert,
  scores: Map<HealthDomain, number>
): InterventionPlan | null {
  const interventions: Intervention[] = [];

  switch (alert.category) {
    case "sleep_debt":
      interventions.push(
        { action: "Set a consistent bedtime alarm — same time every night, even weekends", frequency: "daily", difficulty: "easy", expectedImpact: "high", domain: "sleep", trackingMetric: "Sleep consistency" },
        { action: "Create a 20-minute wind-down routine (dim lights, no screens, gentle stretching)", frequency: "daily", difficulty: "moderate", expectedImpact: "high", domain: "sleep", trackingMetric: "Sleep quality score" },
        { action: "Limit caffeine after 12pm", frequency: "daily", difficulty: "moderate", expectedImpact: "moderate", domain: "sleep", trackingMetric: "Afternoon energy levels" },
      );
      break;

    case "stress_accumulation":
      interventions.push(
        { action: "4-7-8 breathing exercise (3 minutes)", frequency: "daily", difficulty: "easy", expectedImpact: "moderate", domain: "emotional", trackingMetric: "Stress level self-rating" },
        { action: "Take a 15-minute outdoor walk", frequency: "daily", difficulty: "easy", expectedImpact: "high", domain: "emotional", trackingMetric: "Post-walk mood" },
        { action: "Identify one stressor you can reduce or delegate", frequency: "weekly", difficulty: "challenging", expectedImpact: "high", domain: "emotional", trackingMetric: "Weekly stress trend" },
      );
      break;

    case "fatigue_pattern":
      interventions.push(
        { action: "Start with 10 minutes of gentle movement (walking, stretching)", frequency: "daily", difficulty: "easy", expectedImpact: "gradual", domain: "activity", trackingMetric: "Daily energy self-rating" },
        { action: "Ensure one nutritious meal with protein and vegetables", frequency: "daily", difficulty: "moderate", expectedImpact: "moderate", domain: "nutrition", trackingMetric: "Afternoon fatigue levels" },
      );
      break;

    case "burnout":
      interventions.push(
        { action: "Block one hour of unstructured rest per day — no productivity", frequency: "daily", difficulty: "challenging", expectedImpact: "high", domain: "wellness", trackingMetric: "Burnout risk score" },
        { action: "Reduce non-essential commitments for the next 2 weeks", frequency: "as_needed", difficulty: "challenging", expectedImpact: "high", domain: "emotional", trackingMetric: "Weekly energy trend" },
        { action: "Protect sleep above all else — it's the foundation of recovery", frequency: "daily", difficulty: "moderate", expectedImpact: "high", domain: "sleep", trackingMetric: "Sleep quality" },
      );
      break;

    case "recovery_instability":
      interventions.push(
        { action: "Ensure medication consistency — set daily reminders", frequency: "daily", difficulty: "easy", expectedImpact: "high", domain: "medication", trackingMetric: "Medication adherence" },
        { action: "Reduce physical intensity — prioritize rest", frequency: "daily", difficulty: "moderate", expectedImpact: "moderate", domain: "recovery", trackingMetric: "Recovery score trend" },
      );
      break;

    default:
      interventions.push(
        { action: "Check in with how you're feeling — awareness is the first step", frequency: "daily", difficulty: "easy", expectedImpact: "gradual", domain: "wellness", trackingMetric: "Self-check completion" },
      );
  }

  return {
    id: `plan-${alert.id}`,
    title: alert.title,
    targetDomains: alert.contributingDomains,
    priority: alert.severity === "urgent" ? "immediate" : alert.severity === "warning" ? "this_week" : "this_month",
    interventions,
    expectedOutcome: `Improvement in ${alert.contributingDomains.map(formatDomain).join(" and ")} within ${alert.timeHorizon}.`,
    reviewDate: Date.now() + (alert.timeHorizon === "days" ? 7 : alert.timeHorizon === "weeks" ? 21 : 60) * 86_400_000,
    adaptiveAdjustments: [
      "If progress stalls, we'll adjust intensity and focus.",
      "Interventions will adapt as your data evolves.",
    ],
    narrative: `This plan targets ${alert.title.toLowerCase()}. Start with the easiest action and build from there — consistency beats intensity.`,
  };
}

function formatDomain(domain: HealthDomain): string {
  const labels: Record<string, string> = {
    sleep: "sleep", activity: "activity", emotional: "stress management",
    nutrition: "nutrition", wellness: "wellness", recovery: "recovery",
    medication: "medication", wearable: "wearable tracking",
    disease_intelligence: "health monitoring", coaching: "coaching",
    preventive: "preventive care",
  };
  return labels[domain] || domain;
}

function getEncouragement(planCount: number, scores: Map<HealthDomain, number>): string {
  const avgScore = [...scores.values()].reduce((a, b) => a + b, 0) / Math.max(1, scores.size);

  if (planCount === 0) {
    return "You're doing well! Maintaining healthy habits is just as important as building them. Keep going. 💚";
  }
  if (avgScore > 60) {
    return "You have a strong foundation. The adjustments we're suggesting are about optimization, not crisis. You're already doing many things right.";
  }
  if (planCount > 3) {
    return "It might feel like a lot right now, but remember: you don't need to fix everything at once. Pick one thing, do it consistently, and let the momentum build.";
  }
  return "Every small step counts. The fact that you're aware and engaged is already a powerful first step. You've got this. 💪";
}
