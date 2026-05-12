/**
 * LongitudinalHealthIdentity — Builds a persistent "health identity" from
 * longitudinal data: chronic conditions, baseline vitals, behavioral patterns,
 * recovery tendencies. The AI's long-term memory of "who this user is health-wise."
 */
import { useCallback } from "react";
import type { HealthMemoryEntry } from "./UnifiedHealthMemory";
import type { HealthDomain } from "../UnifiedHealthEngine";

export interface HealthIdentity {
  // Baselines
  baselineVitals: BaselineVital[];
  chronicConditions: string[];
  recurringSymptoms: RecurringPattern[];

  // Behavioral profile
  sleepProfile: BehavioralProfile;
  activityProfile: BehavioralProfile;
  stressProfile: BehavioralProfile;

  // Recovery tendencies
  recoveryPattern: "fast" | "average" | "slow" | "variable" | "unknown";
  averageRecoveryDays: number | null;

  // Health personality
  healthEngagement: "proactive" | "responsive" | "passive" | "unknown";
  medicationAdherencePattern: "consistent" | "irregular" | "declining" | "unknown";

  // Narrative
  identitySummary: string;
  dataSpanDays: number;
  confidence: number;   // 0-100
}

export interface BaselineVital {
  metric: string;
  averageValue: number;
  normalRange: { min: number; max: number };
  trend: "stable" | "rising" | "falling";
  lastUpdated: number;
}

export interface RecurringPattern {
  symptom: string;
  frequency: "weekly" | "monthly" | "seasonal" | "sporadic";
  averageInterval: number;   // days
  lastOccurrence: number;
  associatedDomains: HealthDomain[];
}

export interface BehavioralProfile {
  averageScore: number;
  consistency: number;      // 0-100
  bestPeriod: string;       // time description
  worstPeriod: string;
  trend: "improving" | "stable" | "declining" | "unknown";
}

export function useLongitudinalHealthIdentity() {
  /**
   * Build the health identity from historical memory entries.
   */
  const buildIdentity = useCallback((entries: HealthMemoryEntry[]): HealthIdentity => {
    if (entries.length === 0) {
      return getEmptyIdentity();
    }

    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const oldest = sorted[0].timestamp;
    const newest = sorted[sorted.length - 1].timestamp;
    const dataSpanDays = Math.ceil((newest - oldest) / 86_400_000);

    // Group by domain
    const byDomain = new Map<HealthDomain, HealthMemoryEntry[]>();
    for (const entry of sorted) {
      const list = byDomain.get(entry.domain) || [];
      list.push(entry);
      byDomain.set(entry.domain, list);
    }

    // ── Build Profiles ──
    const sleepProfile = buildBehavioralProfile(byDomain.get("sleep") || []);
    const activityProfile = buildBehavioralProfile(byDomain.get("activity") || []);
    const stressProfile = buildBehavioralProfile(byDomain.get("emotional") || []);

    // ── Recovery Pattern ──
    const recoveryEntries = byDomain.get("recovery") || [];
    const recoveryPattern = detectRecoveryPattern(recoveryEntries);

    // ── Chronic Conditions ──
    const investigations = byDomain.get("disease_intelligence") || [];
    const chronicConditions = detectChronicConditions(investigations);

    // ── Recurring Symptoms ──
    const recurringSymptoms = detectRecurringPatterns(investigations);

    // ── Health Engagement ──
    const engagementScore = entries.length / Math.max(1, dataSpanDays) * 7;
    let healthEngagement: HealthIdentity["healthEngagement"];
    if (engagementScore > 5) healthEngagement = "proactive";
    else if (engagementScore > 2) healthEngagement = "responsive";
    else if (entries.length > 5) healthEngagement = "passive";
    else healthEngagement = "unknown";

    // ── Medication Adherence ──
    const medEntries = byDomain.get("medication") || [];
    const medicationAdherencePattern = detectAdherencePattern(medEntries);

    // ── Confidence ──
    const confidence = Math.min(100, Math.round(
      (dataSpanDays > 30 ? 30 : dataSpanDays) * 2 +
      (entries.length > 50 ? 30 : entries.length * 0.6) +
      (byDomain.size > 5 ? 10 : byDomain.size * 2)
    ));

    // ── Baseline Vitals (from wearable data) ──
    const wearableEntries = byDomain.get("wearable") || [];
    const baselineVitals = buildBaselineVitals(wearableEntries);

    // ── Summary ──
    const identitySummary = generateIdentitySummary({
      dataSpanDays, healthEngagement, sleepProfile, activityProfile,
      recoveryPattern: recoveryPattern.pattern, chronicConditions, confidence,
    });

    return {
      baselineVitals, chronicConditions, recurringSymptoms,
      sleepProfile, activityProfile, stressProfile,
      recoveryPattern: recoveryPattern.pattern,
      averageRecoveryDays: recoveryPattern.avgDays,
      healthEngagement, medicationAdherencePattern,
      identitySummary, dataSpanDays, confidence,
    };
  }, []);

  return { buildIdentity };
}

// ── Helpers ──────────────────────────────
function getEmptyIdentity(): HealthIdentity {
  const emptyProfile: BehavioralProfile = {
    averageScore: 50, consistency: 0, bestPeriod: "N/A",
    worstPeriod: "N/A", trend: "unknown",
  };
  return {
    baselineVitals: [], chronicConditions: [], recurringSymptoms: [],
    sleepProfile: emptyProfile, activityProfile: emptyProfile, stressProfile: emptyProfile,
    recoveryPattern: "unknown", averageRecoveryDays: null,
    healthEngagement: "unknown", medicationAdherencePattern: "unknown",
    identitySummary: "We're just getting started building your health profile. As more data comes in, your health identity will become richer.",
    dataSpanDays: 0, confidence: 0,
  };
}

function buildBehavioralProfile(entries: HealthMemoryEntry[]): BehavioralProfile {
  if (entries.length < 3) {
    return { averageScore: 50, consistency: 0, bestPeriod: "N/A", worstPeriod: "N/A", trend: "unknown" };
  }

  const scores = entries.filter(e => e.score != null).map(e => e.score!);
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const variance = scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) / scores.length;
  const consistency = Math.max(0, Math.round(100 - Math.sqrt(variance)));

  const recent = scores.slice(-5);
  const earlier = scores.slice(0, 5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  let trend: BehavioralProfile["trend"];
  if (recentAvg > earlierAvg + 5) trend = "improving";
  else if (recentAvg < earlierAvg - 5) trend = "declining";
  else trend = "stable";

  return { averageScore, consistency, bestPeriod: "Recent weeks", worstPeriod: "Earlier period", trend };
}

function detectRecoveryPattern(entries: HealthMemoryEntry[]): { pattern: HealthIdentity["recoveryPattern"]; avgDays: number | null } {
  if (entries.length < 3) return { pattern: "unknown", avgDays: null };

  const scores = entries.filter(e => e.score != null).map(e => e.score!);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;

  if (variance > 400) return { pattern: "variable", avgDays: null };
  if (avgScore > 70) return { pattern: "fast", avgDays: 5 };
  if (avgScore > 50) return { pattern: "average", avgDays: 10 };
  return { pattern: "slow", avgDays: 18 };
}

function detectChronicConditions(entries: HealthMemoryEntry[]): string[] {
  const conditionCounts = new Map<string, number>();
  for (const entry of entries) {
    const condition = entry.metadata?.primaryCondition as string;
    if (condition) {
      conditionCounts.set(condition, (conditionCounts.get(condition) || 0) + 1);
    }
  }
  return [...conditionCounts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([condition]) => condition);
}

function detectRecurringPatterns(entries: HealthMemoryEntry[]): RecurringPattern[] {
  // Simplified recurring pattern detection
  const symptomOccurrences = new Map<string, number[]>();
  for (const entry of entries) {
    const symptoms = entry.metadata?.symptoms as string[] | undefined;
    if (symptoms) {
      for (const symptom of symptoms) {
        const list = symptomOccurrences.get(symptom) || [];
        list.push(entry.timestamp);
        symptomOccurrences.set(symptom, list);
      }
    }
  }

  return [...symptomOccurrences.entries()]
    .filter(([, times]) => times.length >= 3)
    .map(([symptom, times]) => {
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push((times[i] - times[i - 1]) / 86_400_000);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      let frequency: RecurringPattern["frequency"];
      if (avgInterval < 10) frequency = "weekly";
      else if (avgInterval < 45) frequency = "monthly";
      else if (avgInterval < 120) frequency = "seasonal";
      else frequency = "sporadic";

      return {
        symptom, frequency, averageInterval: Math.round(avgInterval),
        lastOccurrence: times[times.length - 1],
        associatedDomains: ["disease_intelligence" as HealthDomain],
      };
    });
}

function detectAdherencePattern(entries: HealthMemoryEntry[]): HealthIdentity["medicationAdherencePattern"] {
  if (entries.length < 5) return "unknown";
  const scores = entries.filter(e => e.score != null).map(e => e.score!);
  const recent = scores.slice(-5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - recentAvg, 2), 0) / scores.length;

  if (recentAvg > 75 && variance < 200) return "consistent";
  if (recentAvg < 50) return "declining";
  return "irregular";
}

function buildBaselineVitals(entries: HealthMemoryEntry[]): BaselineVital[] {
  // Extract vitals from wearable metadata
  const heartRates = entries
    .map(e => e.metadata?.heartRate as number)
    .filter(Boolean);

  if (heartRates.length < 3) return [];

  const avgHR = Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length);
  const recentHR = heartRates.slice(-5);
  const recentAvgHR = recentHR.reduce((a, b) => a + b, 0) / recentHR.length;

  return [{
    metric: "Resting Heart Rate",
    averageValue: avgHR,
    normalRange: { min: 60, max: 100 },
    trend: recentAvgHR > avgHR + 3 ? "rising" : recentAvgHR < avgHR - 3 ? "falling" : "stable",
    lastUpdated: entries[entries.length - 1]?.timestamp || Date.now(),
  }];
}

function generateIdentitySummary(ctx: {
  dataSpanDays: number; healthEngagement: string;
  sleepProfile: BehavioralProfile; activityProfile: BehavioralProfile;
  recoveryPattern: string; chronicConditions: string[]; confidence: number;
}): string {
  if (ctx.confidence < 20) {
    return "Your health identity is still forming. Continue using the platform, and we'll build a comprehensive understanding of your unique health patterns.";
  }

  const parts: string[] = [];
  parts.push(`Based on ${ctx.dataSpanDays} days of health data`);

  if (ctx.sleepProfile.trend !== "unknown") {
    parts.push(`sleep quality is ${ctx.sleepProfile.trend}`);
  }
  if (ctx.activityProfile.averageScore > 60) {
    parts.push("maintaining a reasonably active lifestyle");
  }
  if (ctx.recoveryPattern !== "unknown") {
    parts.push(`recovery tendency is ${ctx.recoveryPattern}`);
  }
  if (ctx.chronicConditions.length > 0) {
    parts.push(`with ${ctx.chronicConditions.length} recurring health area${ctx.chronicConditions.length > 1 ? "s" : ""}`);
  }

  return parts.join(", ") + ".";
}
