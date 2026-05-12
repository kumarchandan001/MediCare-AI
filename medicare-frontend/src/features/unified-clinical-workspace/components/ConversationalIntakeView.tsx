/**
 * ConversationalIntakeView — Adaptive clinical interview experience.
 * Replaces form-first workflow with doctor-like conversational investigation.
 * Calm, progressive, medically coherent.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";
import { useClinicalSession } from "../ClinicalSessionManager";

export default function ConversationalIntakeView() {
  const inv = useInvestigation();
  const session = useClinicalSession();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inv.conversation.length]);

  // ── Start interview ────────────────────
  const handleStart = useCallback(async () => {
    setIsLoading(true);
    try {
      await session.startInterview();
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [session]);

  // ── Submit response ────────────────────
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!text || !inv.currentQuestion || isLoading) return;

    setIsLoading(true);
    setInputValue("");

    try {
      await session.respondToQuestion(inv.currentQuestion.id, text);
    } catch {
      // Error already logged in session manager
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, inv.currentQuestion, isLoading, session]);

  // ── Option click (for multiple choice) ─
  const handleOptionClick = useCallback(async (option: string) => {
    if (!inv.currentQuestion || isLoading) return;
    setIsLoading(true);
    try {
      await session.respondToQuestion(inv.currentQuestion.id, option);
    } finally {
      setIsLoading(false);
    }
  }, [inv.currentQuestion, isLoading, session]);

  // ── Complete and analyze ───────────────
  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      await session.completeInterview();
    } catch {
      setIsLoading(false);
    }
  }, [session]);

  // Stage labels for progress
  const stageLabels: Record<string, string> = {
    initial_intake: "Understanding Your Symptoms",
    symptom_clarification: "Clarifying Details",
    severity_exploration: "Assessing Severity",
    context_refinement: "Refining Context",
    risk_assessment: "Evaluating Risk Factors",
    investigation_summary: "Preparing Summary",
    monitoring_recommendations: "Recommendations",
  };

  const currentStage = inv.interviewState?.current_stage || "initial_intake";
  const completeness = inv.interviewState?.investigation_completeness ?? 0;

  // ── Landing screen (before interview starts) ─
  if (!inv.sessionId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="ucw-intake-landing"
      >
        <div className="ucw-intake-landing-inner">
          {/* Orb */}
          <div className="ucw-intake-orb">
            <i className="fas fa-stethoscope" style={{
              fontSize: "1.5rem", color: theme.colors.accent.primary,
            }} />
          </div>

          <h2 style={{
            fontSize: "1.1rem", fontWeight: 900, color: "rgba(255,255,255,0.95)",
            letterSpacing: "-0.02em", textAlign: "center",
            marginTop: 20,
          }}>
            Clinical Investigation
          </h2>

          <p style={{
            fontSize: "0.75rem", color: "rgba(255,255,255,0.45)",
            textAlign: "center", lineHeight: 1.7, maxWidth: 380,
            margin: "8px auto 0",
          }}>
            An adaptive AI-guided health investigation that asks thoughtful questions,
            adapts to your responses, and builds an evolving understanding of your health.
          </p>

          {/* Longitudinal awareness */}
          {inv.longitudinalHistory.length > 0 && (
            <div style={{
              marginTop: 16, padding: "10px 14px", borderRadius: 10,
              background: "rgba(156,111,255,0.04)",
              border: "1px solid rgba(156,111,255,0.1)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <i className="fas fa-link" style={{
                fontSize: "0.65rem", color: theme.colors.health.sleep.DEFAULT,
              }} />
              <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.5)" }}>
                Continuing from {inv.longitudinalHistory.length} prior investigation{inv.longitudinalHistory.length > 1 ? "s" : ""} — the system maintains your health context.
              </span>
            </div>
          )}

          {/* Monitoring pulse */}
          <div style={{
            marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: theme.colors.accent.primary,
              animation: "ucw-pulse-soft 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)" }}>
              Continuous health monitoring active
            </span>
          </div>

          {/* Safety note */}
          <div style={{
            marginTop: 20, padding: "10px 14px", borderRadius: 10,
            background: "rgba(255,179,0,0.03)",
            border: "1px solid rgba(255,179,0,0.08)",
            fontSize: "0.6rem", color: "rgba(255,255,255,0.38)",
            lineHeight: 1.6, textAlign: "center",
          }}>
            <i className="fas fa-shield-halved" style={{
              marginRight: 6, color: "rgba(255,179,0,0.5)",
            }} />
            This is not a diagnostic tool. It helps organize health observations
            for discussion with a healthcare professional.
          </div>

          <motion.button
            onClick={handleStart}
            disabled={isLoading}
            className="ucw-begin-btn"
            whileHover={{ y: -2, boxShadow: "0 0 40px rgba(0,245,200,0.25)" }}
            whileTap={{ scale: 0.98 }}
            style={{
              marginTop: 24, width: "100%", padding: "14px 0",
              borderRadius: 16, border: "none",
              fontWeight: 900, fontSize: "0.88rem",
              fontFamily: theme.typography.fonts.primary,
              cursor: isLoading ? "not-allowed" : "pointer",
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: theme.colors.bg.primary,
              boxShadow: "0 0 28px rgba(0,245,200,0.18), 0 4px 16px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? (
              <>
                <i className="fas fa-circle-notch fa-spin" />
                Preparing…
              </>
            ) : (
              <>
                <i className="fas fa-stethoscope" />
                Begin Investigation
              </>
            )}
          </motion.button>

          {/* Manual add button */}
          <button
            onClick={() => inv.setManualSymptomsPanelOpen(true)}
            style={{
              marginTop: 10, width: "100%", padding: "10px 0",
              borderRadius: 12, fontSize: "0.7rem", fontWeight: 600,
              fontFamily: theme.typography.fonts.primary,
              background: "transparent",
              border: `1px solid ${theme.colors.border[2]}`,
              color: theme.colors.text.subtle,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <i className="fas fa-plus" style={{ fontSize: "0.55rem" }} />
            Add Symptoms Manually
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Active conversation ────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="ucw-conversation-view"
    >
      {/* Progress header */}
      <div className="ucw-conv-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "rgba(0,245,200,0.08)",
            border: "1px solid rgba(0,245,200,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="fas fa-stethoscope" style={{
              fontSize: "0.65rem", color: theme.colors.accent.primary,
            }} />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
              {stageLabels[currentStage] || currentStage}
            </div>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)" }}>
              {Math.round(completeness * 100)}% complete
            </div>
          </div>
        </div>

        {/* Completeness bar */}
        <div style={{
          width: 80, height: 3, borderRadius: 999,
          background: "rgba(255,255,255,0.06)", overflow: "hidden",
        }}>
          <motion.div
            style={{
              height: "100%", borderRadius: 999,
              background: `linear-gradient(90deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.round(completeness * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>

      {/* Conversation timeline */}
      <div className="ucw-conv-timeline">
        <AnimatePresence>
          {inv.conversation.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`ucw-conv-entry ucw-conv-${entry.type}`}
            >
              {entry.type === "question" && (
                <div className="ucw-conv-ai-msg">
                  <div className="ucw-conv-ai-avatar">
                    <i className="fas fa-stethoscope" />
                  </div>
                  <div className="ucw-conv-ai-text">{entry.text}</div>
                </div>
              )}
              {entry.type === "answer" && (
                <div className="ucw-conv-user-msg">
                  <div className="ucw-conv-user-text">{entry.text}</div>
                </div>
              )}
              {entry.type === "stage_change" && (
                <div className="ucw-conv-stage">
                  <div className="ucw-conv-stage-line" />
                  <span className="ucw-conv-stage-label">
                    <i className="fas fa-arrow-right" style={{ fontSize: "0.45rem", marginRight: 4 }} />
                    {entry.text}
                  </span>
                  <div className="ucw-conv-stage-line" />
                </div>
              )}
              {entry.type === "escalation" && (
                <div className="ucw-conv-escalation">
                  <i className="fas fa-triangle-exclamation" style={{
                    color: theme.colors.health.warning.DEFAULT, fontSize: "0.65rem",
                  }} />
                  <span>{entry.text}</span>
                </div>
              )}
              {entry.type === "insight" && (
                <div className="ucw-conv-insight">
                  <i className="fas fa-lightbulb" style={{
                    color: theme.colors.accent.primary, fontSize: "0.55rem",
                  }} />
                  <span>{entry.text}</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ucw-conv-typing"
          >
            <div className="ucw-conv-ai-avatar">
              <i className="fas fa-stethoscope" />
            </div>
            <div className="ucw-typing-dots">
              <span /><span /><span />
            </div>
          </motion.div>
        )}
        <div ref={timelineEndRef} />
      </div>

      {/* Input area */}
      <div className="ucw-conv-input-area">
        {/* Quick options if available */}
        {inv.currentQuestion?.options && inv.currentQuestion.options.length > 0 && (
          <div className="ucw-conv-options">
            {inv.currentQuestion.options.map(opt => (
              <button
                key={opt}
                onClick={() => handleOptionClick(opt)}
                disabled={isLoading}
                className="ucw-conv-option-btn"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="ucw-conv-input-form">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Describe your experience…"
            disabled={isLoading}
            className="ucw-conv-input"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="ucw-conv-send-btn"
          >
            <i className="fas fa-arrow-up" />
          </button>
        </form>

        {/* Action row */}
        <div className="ucw-conv-actions">
          <button
            onClick={() => inv.setManualSymptomsPanelOpen(true)}
            className="ucw-conv-action-btn"
          >
            <i className="fas fa-plus" /> Add Symptoms
          </button>
          {completeness >= 0.4 && (
            <button
              onClick={handleComplete}
              disabled={isLoading}
              className="ucw-conv-action-btn ucw-conv-action-primary"
            >
              <i className="fas fa-microscope" /> Analyze Now
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
