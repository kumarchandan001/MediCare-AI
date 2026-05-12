/**
 * LongitudinalReasoningOrchestrator — Now with Health Companion integration.
 * Manages idle ↔ active investigation transitions with companion presence,
 * humanized narratives, adaptive guidance, and longitudinal context.
 */
import { useCallback, useState, useEffect } from "react";
import { useInvestigation } from "@/features/unified-clinical-workspace/InvestigationStateProvider";
import { useTemporalHealth } from "./TemporalHealthStateProvider";
import { useLongitudinalEngine } from "./LongitudinalHealthEngine";
import { useCompanion } from "@/features/health-companion/CompanionStateProvider";
import InvestigationFlowController from "@/features/unified-clinical-workspace/InvestigationFlowController";
import ManualSymptomRefinementPanel from "@/features/unified-clinical-workspace/components/ManualSymptomRefinementPanel";
import PassiveMonitoringPanel from "./components/PassiveMonitoringPanel";
import HealthJourneyTimeline from "./components/HealthJourneyTimeline";
import WearableContinuityPanel from "./components/WearableContinuityPanel";
import RecurrenceDetectionPanel from "./components/RecurrenceDetectionPanel";
import AdaptiveHealthGuidance from "@/features/health-companion/components/AdaptiveHealthGuidance";

export default function LongitudinalReasoningOrchestrator() {
  const inv = useInvestigation();
  const temporal = useTemporalHealth();
  const engine = useLongitudinalEngine();
  const companion = useCompanion();

  // Panel expansion states
  const [journeyExpanded, setJourneyExpanded] = useState(false);
  const [wearableExpanded, setWearableExpanded] = useState(false);
  const [recurrenceExpanded, setRecurrenceExpanded] = useState(false);
  const [guidanceExpanded, setGuidanceExpanded] = useState(false);
  const [investigationStarted, setInvestigationStarted] = useState(false);

  const isIdle = !investigationStarted && inv.phase === "intake" && !inv.sessionId;

  // ── Emotional state adaptation based on investigation phase ──
  useEffect(() => {
    companion.assessEmotionalState(inv.phase, inv.escalationLevel);
  }, [inv.phase, inv.escalationLevel]);

  // ── Cognitive load adaptation for high-stress states ──
  useEffect(() => {
    companion.adaptToStress();
  }, [companion.emotionalContext.userStressLevel]);

  // Reset investigation started flag when investigation is fully reset
  useEffect(() => {
    if (!inv.sessionId && inv.phase === "intake" && inv.conversation.length === 0) {
      // Only auto-reset if the investigation was explicitly reset (empty conversation)
    }
  }, [inv.sessionId, inv.phase, inv.conversation.length]);

  const handleStartInvestigation = useCallback(() => {
    // Mark that the user wants to start an investigation.
    // This transitions from idle (passive monitoring) to the
    // ConversationalIntakeView landing page where the actual API call happens.
    setInvestigationStarted(true);
    inv.setPhase("intake");
  }, [inv]);

  return (
    <div className="ucw-workspace animate-page-in">
      {isIdle ? (
        <>
          {/* ═══ IDLE STATE — Companion-powered passive monitoring ═══ */}
          <PassiveMonitoringPanel onStartInvestigation={handleStartInvestigation} />

          {/* Adaptive health guidance */}
          <AdaptiveHealthGuidance
            expanded={guidanceExpanded}
            onToggle={() => setGuidanceExpanded(p => !p)}
          />

          {/* Longitudinal panels */}
          <HealthJourneyTimeline
            expanded={journeyExpanded}
            onToggle={() => setJourneyExpanded(p => !p)}
          />
          <WearableContinuityPanel
            expanded={wearableExpanded}
            onToggle={() => setWearableExpanded(p => !p)}
          />
          <RecurrenceDetectionPanel
            expanded={recurrenceExpanded}
            onToggle={() => setRecurrenceExpanded(p => !p)}
          />
        </>
      ) : (
        <>
          {/* ═══ ACTIVE STATE — Investigation Flow ═══ */}
          <InvestigationFlowController />

          {/* Longitudinal context during investigation results */}
          {inv.phase === "investigation" && (
            <>
              <AdaptiveHealthGuidance
                expanded={guidanceExpanded}
                onToggle={() => setGuidanceExpanded(p => !p)}
              />
              <HealthJourneyTimeline
                expanded={journeyExpanded}
                onToggle={() => setJourneyExpanded(p => !p)}
              />
              <WearableContinuityPanel
                expanded={wearableExpanded}
                onToggle={() => setWearableExpanded(p => !p)}
              />
              <RecurrenceDetectionPanel
                expanded={recurrenceExpanded}
                onToggle={() => setRecurrenceExpanded(p => !p)}
              />
            </>
          )}
        </>
      )}

      <ManualSymptomRefinementPanel />
    </div>
  );
}
