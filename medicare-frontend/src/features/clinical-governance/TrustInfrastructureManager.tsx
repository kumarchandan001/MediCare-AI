/**
 * TrustInfrastructureManager — Monitors overall system trust health across
 * sessions. Computes a TrustScore from reasoning stability, audit completeness,
 * safety record, and recovery success rate. Exposes trust signals for UI.
 */
import { useCallback } from "react";
import type { TrustScore } from "./GovernanceStateProvider";

export interface TrustSignal {
  dimension: string;
  label: string;
  score: number;
  status: "healthy" | "degraded" | "critical";
  detail: string;
  icon: string;
}

export interface TrustHealthReport {
  overallScore: number;
  grade: TrustScore["grade"];
  signals: TrustSignal[];
  narrative: string;
  recommendations: string[];
  lastUpdated: number;
}

export function useTrustInfrastructure() {
  const computeHealth = useCallback((trustScore: TrustScore, additionalContext?: {
    recentViolationCount?: number;
    recentRecoveryCount?: number;
    auditGapDetected?: boolean;
    wearableDisconnected?: boolean;
  }): TrustHealthReport => {
    const ctx = additionalContext || {};
    const signals: TrustSignal[] = [];
    const recommendations: string[] = [];

    // 1. Reasoning Stability Signal
    const rsStatus = trustScore.reasoningStability >= 80 ? "healthy" : trustScore.reasoningStability >= 50 ? "degraded" : "critical";
    signals.push({
      dimension: "reasoning",
      label: "Reasoning Stability",
      score: trustScore.reasoningStability,
      status: rsStatus,
      detail: rsStatus === "healthy"
        ? "Clinical reasoning has been consistent and well-moderated."
        : rsStatus === "degraded"
        ? "Some reasoning volatility detected — outputs are being moderated."
        : "Significant reasoning instability — enhanced governance is active.",
      icon: "fa-brain",
    });
    if (rsStatus !== "healthy") recommendations.push("Consider providing more detailed symptom information for improved reasoning accuracy.");

    // 2. Audit Completeness Signal
    const acStatus = trustScore.auditCompleteness >= 80 ? "healthy" : trustScore.auditCompleteness >= 50 ? "degraded" : "critical";
    signals.push({
      dimension: "audit",
      label: "Audit Trail",
      score: trustScore.auditCompleteness,
      status: ctx.auditGapDetected ? "degraded" : acStatus,
      detail: acStatus === "healthy"
        ? "All investigations are fully audited and traceable."
        : "Some audit records may be incomplete — governance is monitoring.",
      icon: "fa-clipboard-check",
    });

    // 3. Safety Record Signal
    const srStatus = trustScore.safetyRecord >= 85 ? "healthy" : trustScore.safetyRecord >= 60 ? "degraded" : "critical";
    signals.push({
      dimension: "safety",
      label: "Safety Record",
      score: trustScore.safetyRecord,
      status: srStatus,
      detail: srStatus === "healthy"
        ? "No critical safety events. All outputs have been governance-approved."
        : "Safety events have occurred — governance guards are actively protecting you.",
      icon: "fa-shield-heart",
    });
    if (srStatus === "critical") recommendations.push("Consider consulting a healthcare professional for your current concerns.");

    // 4. Recovery Resilience Signal
    const rrStatus = trustScore.recoverySuccess >= 80 ? "healthy" : trustScore.recoverySuccess >= 50 ? "degraded" : "critical";
    signals.push({
      dimension: "recovery",
      label: "System Resilience",
      score: trustScore.recoverySuccess,
      status: rrStatus,
      detail: rrStatus === "healthy"
        ? "System is fully operational with all safeguards active."
        : "Some operational constraints detected — core functionality remains safe.",
      icon: "fa-server",
    });

    // 5. Wearable Signal (conditional)
    if (ctx.wearableDisconnected !== undefined) {
      signals.push({
        dimension: "wearable",
        label: "Wearable Connection",
        score: ctx.wearableDisconnected ? 20 : 90,
        status: ctx.wearableDisconnected ? "degraded" : "healthy",
        detail: ctx.wearableDisconnected
          ? "Wearable device is disconnected — analysis based on symptoms only."
          : "Wearable data is being integrated into the analysis.",
        icon: "fa-watch",
      });
    }

    // Build narrative
    const healthyCount = signals.filter(s => s.status === "healthy").length;
    const totalCount = signals.length;
    let narrative: string;

    if (healthyCount === totalCount) {
      narrative = "All trust systems are healthy. Your health intelligence is operating at full capacity with complete governance coverage.";
    } else if (healthyCount >= totalCount * 0.7) {
      narrative = "Most trust systems are healthy with minor observations noted. Governance safeguards are active and monitoring all outputs.";
    } else {
      narrative = "Some trust dimensions require attention. Enhanced governance controls are active to ensure safe and accountable outputs.";
    }

    return {
      overallScore: trustScore.overall,
      grade: trustScore.grade,
      signals,
      narrative,
      recommendations,
      lastUpdated: Date.now(),
    };
  }, []);

  return { computeHealth };
}
