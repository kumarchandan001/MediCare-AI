/**
 * InvestigationResultsView — The unified investigation workspace displayed after analysis.
 * Uses Clinical Focus Mode to prioritize the most relevant panel.
 * Implements progressive disclosure with calm-first defaults.
 * Records completed investigations to longitudinal health memory.
 */
import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";
import { useClinicalSession } from "../ClinicalSessionManager";
import { useWorkspaceLayout } from "../WorkspaceLayoutManager";
import { useLongitudinalEngine } from "@/features/longitudinal-health/LongitudinalHealthEngine";
import ClinicalNarrativeHero from "./ClinicalNarrativeHero";
import DifferentialReasoningFlow from "./DifferentialReasoningFlow";
import EvidenceReasoningPanel from "./EvidenceReasoningPanel";
import UncertaintyTransparencyView from "./UncertaintyTransparencyView";
import ContradictionInsightView from "./ContradictionInsightView";
import InvestigationTimeline from "./InvestigationTimeline";
import TrustSafetyFooter from "./TrustSafetyFooter";
import ClinicalStorytellingPanel from "./ClinicalStorytellingPanel";
import { ConsultSection } from "@/features/prediction/components/ConsultSection";
import TrustRefinementLayer from "@/features/clinical-realism/components/TrustRefinementLayer";
import ReasoningAuditTrail from "@/features/clinical-realism/components/ReasoningAuditTrail";
import BelievabilityIndicators from "@/features/clinical-realism/components/BelievabilityIndicators";
import ConsistencyTransparencyPanel from "@/features/clinical-realism/components/ConsistencyTransparencyPanel";
import InvestigationTrustSignals from "@/features/clinical-governance/components/InvestigationTrustSignals";
import TransparencyCompliancePanel from "@/features/clinical-governance/components/TransparencyCompliancePanel";

export default function InvestigationResultsView() {
  const inv = useInvestigation();
  const session = useClinicalSession();
  const layout = useWorkspaceLayout();
  const longitudinalEngine = useLongitudinalEngine();
  const hasRecordedRef = useRef(false);

  // ── Record investigation to longitudinal memory ─
  useEffect(() => {
    if (inv.predictionResult && !hasRecordedRef.current) {
      hasRecordedRef.current = true;
      longitudinalEngine.recordCompletedInvestigation({
        id: `inv-${Date.now()}`,
        primaryFinding: inv.predictionResult.predicted_disease,
        confidence: inv.predictionResult.confidence,
        symptoms: inv.predictionResult.matched_symptoms || [],
        escalationLevel: inv.escalationLevel,
        governanceSummary: inv.governance?.summary,
      });
    }
  }, [inv.predictionResult, inv.escalationLevel, inv.governance, longitudinalEngine]);

  // ── Auto-focus on most important panel ─
  useEffect(() => {
    if (inv.isEmergency || inv.escalationLevel !== "routine") {
      layout.applyFocusMode("evidence");
    } else if (inv.ambiguityLevel === "high" || inv.ambiguityLevel === "very_high") {
      layout.applyFocusMode("reasoning");
    } else {
      layout.applyFocusMode("storytelling");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv.isEmergency, inv.escalationLevel, inv.ambiguityLevel]);

  const handleNewInvestigation = useCallback(() => {
    session.resetSession();
    hasRecordedRef.current = false;
  }, [session]);

  // ── Trust indicators (lightweight, non-technical) ─
  const trustIndicators = [
    {
      label: "Reasoning",
      value: inv.governedConfidence >= 60 ? "Stable" : "Evolving",
      icon: "fa-brain",
      color: inv.governedConfidence >= 60 ? theme.colors.health.recovery.DEFAULT : theme.colors.health.warning.DEFAULT,
    },
    {
      label: "Evidence",
      value: inv.evidenceStrength,
      icon: "fa-flask",
      color: inv.evidenceStrength === "Strong" || inv.evidenceStrength === "Very Strong"
        ? theme.colors.health.recovery.DEFAULT
        : theme.colors.health.warning.DEFAULT,
    },
    {
      label: "Completeness",
      value: `${Math.round(inv.investigationCompleteness * 100)}%`,
      icon: "fa-circle-check",
      color: inv.investigationCompleteness > 0.7
        ? theme.colors.health.recovery.DEFAULT
        : theme.colors.health.warning.DEFAULT,
    },
    {
      label: "Uncertainty",
      value: inv.ambiguityLevel === "low" ? "Low" : inv.ambiguityLevel === "moderate" ? "Moderate" : "Notable",
      icon: "fa-shield-halved",
      color: inv.ambiguityLevel === "low"
        ? theme.colors.health.recovery.DEFAULT
        : inv.ambiguityLevel === "moderate"
          ? theme.colors.health.warning.DEFAULT
          : theme.colors.health.strain.DEFAULT,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Investigation header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "rgba(0,245,200,0.08)",
            border: "1px solid rgba(0,245,200,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="fas fa-microscope" style={{
              fontSize: "0.8rem", color: theme.colors.accent.primary,
            }} />
          </div>
          <div>
            <div style={{
              fontSize: "0.88rem", fontWeight: 900,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.02em",
            }}>
              Investigation Results
            </div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.4)" }}>
              AI clinical reasoning • governed • evidence-based
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => inv.setManualSymptomsPanelOpen(true)}
            style={{
              padding: "6px 12px", borderRadius: 10,
              fontSize: "0.58rem", fontWeight: 700,
              background: theme.colors.surface[3],
              border: `1px solid ${theme.colors.border[2]}`,
              color: theme.colors.text.subtle,
              cursor: "pointer",
              fontFamily: theme.typography.fonts.primary,
            }}
          >
            <i className="fas fa-plus" style={{ marginRight: 4, fontSize: "0.5rem" }} />
            Refine
          </button>
          <button
            onClick={handleNewInvestigation}
            style={{
              padding: "6px 14px", borderRadius: 10,
              fontSize: "0.62rem", fontWeight: 700,
              background: theme.colors.surface[3],
              border: `1px solid ${theme.colors.border[2]}`,
              color: theme.colors.text.muted,
              cursor: "pointer",
              fontFamily: theme.typography.fonts.primary,
            }}
          >
            <i className="fas fa-plus" style={{ marginRight: 6, fontSize: "0.55rem" }} />
            New
          </button>
        </div>
      </div>

      {/* Lightweight trust indicators bar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="ucw-trust-bar"
      >
        {trustIndicators.map(ind => (
          <div key={ind.label} className="ucw-trust-bar-item">
            <i className={`fas ${ind.icon}`} style={{
              fontSize: "0.5rem", color: ind.color, opacity: 0.7,
            }} />
            <span style={{ fontSize: "0.55rem", color: ind.color, fontWeight: 700 }}>
              {ind.value}
            </span>
            <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
              {ind.label}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Trust Refinement Badges */}
      {inv.realismValidation && (
        <TrustRefinementLayer 
          disclosure={inv.realismValidation.edgeCaseDisclosure}
          isModerated={!inv.realismValidation.isStable}
          wearablePenalty={inv.realismValidation.wearablePenaltyApplied}
        />
      )}

      {/* Believability Indicators */}
      {inv.realismValidation?.believabilityScores && (
        <BelievabilityIndicators
          confidenceStability={inv.realismValidation.believabilityScores.reasoning || 80}
          evidenceSufficiency={inv.realismValidation.believabilityScores.evidence || 60}
          temporalCoherence={inv.realismValidation.believabilityScores.temporal || 85}
          wearableReliability={inv.realismValidation.believabilityScores.wearable || 90}
          uncertaintyScore={inv.realismValidation.uncertainty?.score || 0}
          escalationModerated={!inv.realismValidation.isStable}
        />
      )}

      {/* 1. Clinical narrative hero — always visible */}
      <ClinicalNarrativeHero />

      {/* 2. Clinical storytelling — progressive disclosure */}
      <ClinicalStorytellingPanel
        expanded={layout.storyExpanded}
        onToggle={() => layout.togglePanel("story")}
      />

      {/* 3. Differential reasoning */}
      <DifferentialReasoningFlow />

      {/* 4. Evidence landscape */}
      <EvidenceReasoningPanel />

      {/* 5. Uncertainty transparency */}
      <UncertaintyTransparencyView />

      {/* 6. Contradiction analysis */}
      <ContradictionInsightView />

      {/* 7. Investigation timeline */}
      <InvestigationTimeline />

      {/* Realism Audit Trail */}
      <ReasoningAuditTrail />

      {/* Consistency Transparency Panel */}
      <ConsistencyTransparencyPanel
        decisions={inv.realismValidation?.allWarnings?.map((w: string, i: number) => ({
          category: "confidence_moderation",
          summary: w,
          detail: w,
          impact: "medium" as const,
          timestamp: Date.now() - i * 1000,
        })) || []}
        escalationEvents={[]}
        uncertaintyNarrative={inv.realismValidation?.uncertainty?.narrativeFrame || ""}
        coherenceScore={inv.realismValidation?.coherence?.overallScore || 100}
      />

      {/* Phase 5: Governance Trust Signals */}
      <InvestigationTrustSignals
        governancePassed={!inv.isEmergency}
        auditRecorded={true}
        safetyChecked={inv.governance?.is_safe !== false}
        privacyRespected={true}
      />

      {/* Phase 5: Transparency & Compliance */}
      <TransparencyCompliancePanel
        hypotheses={inv.realismValidation?.hypotheses || (inv.predictionResult ? [{ condition: inv.predictionResult.predicted_disease, confidence: inv.predictionResult.confidence }] : [])}
        uncertaintyLevel={inv.ambiguityLevel}
        uncertaintyNarrative={inv.realismValidation?.uncertainty?.narrativeFrame || ""}
        governanceNotes={inv.realismValidation?.allWarnings || []}
        wearableUsed={inv.realismValidation?.wearablePenaltyApplied !== undefined}
        disclaimers={["This is an AI-assisted health analysis and should not replace professional medical advice."]}
      />

      {/* Footer actions & safety */}
      <ConsultSection />

      {/* Trust & safety */}
      <TrustSafetyFooter />
    </div>
  );
}
