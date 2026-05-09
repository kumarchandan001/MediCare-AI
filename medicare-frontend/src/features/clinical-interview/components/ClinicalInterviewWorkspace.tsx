import React from "react";
import { clinicalInterviewService } from "../api/clinicalInterview.service";
import type { InterviewResponse, InterviewState, ReasoningMetadata } from "../api/clinicalInterview.service";
import AdaptiveQuestionPanel from "./AdaptiveQuestionPanel";
import ClinicalConversationTimeline from "./ClinicalConversationTimeline";
import type { TimelineEntry } from "./ClinicalConversationTimeline";
import InvestigationProgressTracker from "./InvestigationProgressTracker";
import SeverityAlertPanel from "./SeverityAlertPanel";
import ClinicalReasoningPreview from "./ClinicalReasoningPreview";
import InterviewContextSidebar from "./InterviewContextSidebar";

export default function ClinicalInterviewWorkspace() {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentQuestion, setCurrentQuestion] = React.useState<InterviewResponse["next_question"] | null>(null);
  const [interviewState, setInterviewState] = React.useState<InterviewState | null>(null);
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>([]);
  const [escalation, setEscalation] = React.useState<{ reason: string; action: string } | null>(null);
  const [isStarted, setIsStarted] = React.useState(false);
  const [prevStage, setPrevStage] = React.useState("");

  const userId = "current_user"; // In production, pull from auth store

  // ── Start interview ─────────────────────
  const handleStart = async () => {
    setIsLoading(true);
    try {
      const data = await clinicalInterviewService.start(userId);
      setSessionId(data.session_id);
      setCurrentQuestion(data.next_question);
      setInterviewState(data.state);
      setIsStarted(true);
      addToTimeline("question", data.next_question.text, data.state.current_stage);
    } catch (err) {
      console.error("Failed to start interview", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Respond ─────────────────────────────
  const handleRespond = async (questionId: string, text: string) => {
    if (!sessionId) return;
    setIsLoading(true);

    // Add user answer to timeline
    addToTimeline("answer", text);

    try {
      const data = await clinicalInterviewService.respond(sessionId, userId, questionId, text);

      // Check escalation
      if (data.is_escalated && data.escalation_details) {
        setEscalation({
          reason: data.escalation_details.reason,
          action: data.escalation_details.action,
        });
        addToTimeline("escalation", data.escalation_details.reason);
      } else {
        // Stage change?
        if (data.state.current_stage !== prevStage && prevStage) {
          addToTimeline("stage_change", stageLabel(data.state.current_stage), data.state.current_stage);
        }
        setCurrentQuestion(data.next_question);
        addToTimeline("question", data.next_question.text, data.state.current_stage);
      }

      setInterviewState(data.state);
      setPrevStage(data.state.current_stage);
    } catch (err) {
      console.error("Failed to process response", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset ───────────────────────────────
  const handleReset = async () => {
    if (sessionId) {
      await clinicalInterviewService.reset(sessionId);
    }
    setSessionId(null);
    setCurrentQuestion(null);
    setInterviewState(null);
    setTimeline([]);
    setEscalation(null);
    setIsStarted(false);
    setPrevStage("");
  };

  // ── Timeline helpers ────────────────────
  const addToTimeline = (type: TimelineEntry["type"], text: string, stage?: string) => {
    setTimeline((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, type, text, timestamp: Date.now(), stage },
    ]);
  };

  const stageLabel = (s: string) => {
    const labels: Record<string, string> = {
      initial_intake: "Initial Intake",
      symptom_clarification: "Symptom Clarification",
      severity_exploration: "Severity Exploration",
      context_refinement: "Context Refinement",
      risk_assessment: "Risk Assessment",
      investigation_summary: "Investigation Summary",
      monitoring_recommendations: "Monitoring & Recommendations",
    };
    return labels[s] || s;
  };

  // ── Render ──────────────────────────────
  if (!isStarted) {
    return (
      <div className="ci-landing">
        <div className="ci-landing-content">
          <div className="ci-landing-icon">🩺</div>
          <h1 className="ci-landing-title">Clinical Investigation</h1>
          <p className="ci-landing-subtitle">
            An adaptive, doctor-like interview to understand your symptoms.
            The system will guide you through a structured clinical investigation,
            asking questions that adapt based on your responses.
          </p>
          <div className="ci-landing-safety">
            <p>
              <strong>Important:</strong> This is not a diagnostic tool. It is designed
              to help organise your symptoms for discussion with a healthcare professional.
            </p>
          </div>
          <button className="ci-start-btn" onClick={handleStart} disabled={isLoading}>
            {isLoading ? "Preparing…" : "Begin Investigation"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ci-workspace">
      {/* Severity overlay */}
      <SeverityAlertPanel
        isEscalated={!!escalation}
        reason={escalation?.reason || ""}
        action={escalation?.action || ""}
        onAcknowledge={() => setEscalation(null)}
      />

      {/* Header */}
      <header className="ci-workspace-header">
        <div>
          <h1 className="ci-workspace-title">Clinical Investigation</h1>
          <p className="ci-workspace-stage">{stageLabel(interviewState?.current_stage || "initial_intake")}</p>
        </div>
        <button className="ci-reset-btn" onClick={handleReset}>
          New Investigation
        </button>
      </header>

      {/* Main grid: Timeline + Progress + Context */}
      <div className="ci-workspace-grid">
        {/* Left: Conversation */}
        <main className="ci-main-col">
          <ClinicalConversationTimeline entries={timeline} />
          <AdaptiveQuestionPanel
            question={currentQuestion}
            onRespond={handleRespond}
            isLoading={isLoading}
            stage={interviewState?.current_stage || "initial_intake"}
          />
        </main>

        {/* Right sidebar */}
        <aside className="ci-sidebar-col">
          <InvestigationProgressTracker
            completeness={interviewState?.investigation_completeness || 0}
            ambiguity={interviewState?.remaining_ambiguity || 1}
            stage={interviewState?.current_stage || "initial_intake"}
            symptomCount={interviewState?.active_symptoms?.length || 0}
            evidenceSufficiency={interviewState?.reasoning_metadata?.evidence_sufficiency || "insufficient"}
            reasoningConfidence={interviewState?.reasoning_metadata?.reasoning_confidence || 0.1}
          />
          <ClinicalReasoningPreview metadata={interviewState?.reasoning_metadata || null} />
          <InterviewContextSidebar
            context={null}
            symptoms={interviewState?.active_symptoms || []}
          />
        </aside>
      </div>
    </div>
  );
}
