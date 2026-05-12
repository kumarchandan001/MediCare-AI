/**
 * InvestigationTimeline — Clinical investigation milestone timeline
 * Shows the flow: Intake → Analysis → Reasoning → Evidence → Conclusion
 */
import { motion } from "framer-motion";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";

interface Milestone {
  id: string;
  label: string;
  description: string;
  status: "completed" | "active" | "pending";
  icon: string;
}

export default function InvestigationTimeline() {
  const { predictionResult, governance, phase } = useInvestigation();
  const [expanded, setExpanded] = useState(false);

  if (phase !== "investigation" || !predictionResult) return null;

  const hasGovernance = !!governance;
  const disease = predictionResult.predicted_disease;
  const sympCount = predictionResult.matched_symptoms?.length || 0;

  const milestones: Milestone[] = [
    {
      id: "intake",
      label: "Symptom Intake",
      description: `${sympCount} symptom${sympCount > 1 ? "s" : ""} reported and validated`,
      status: "completed",
      icon: "fa-clipboard-list",
    },
    {
      id: "analysis",
      label: "AI Pattern Analysis",
      description: `LightGBM model evaluated across 41 disease patterns`,
      status: "completed",
      icon: "fa-brain",
    },
    {
      id: "differential",
      label: "Differential Reasoning",
      description: `Primary finding: ${disease} with ${(predictionResult.xai.alternative_diagnoses?.length || 0)} alternatives considered`,
      status: "completed",
      icon: "fa-code-branch",
    },
    {
      id: "evidence",
      label: "Evidence Evaluation",
      description: `Evidence strength: ${predictionResult.xai.evidence_strength}`,
      status: "completed",
      icon: "fa-flask",
    },
    {
      id: "governance",
      label: "Safety Governance",
      description: hasGovernance
        ? governance.summary
        : "Safety checks applied",
      status: hasGovernance ? "completed" : "active",
      icon: "fa-shield-halved",
    },
    {
      id: "conclusion",
      label: "Investigation Summary",
      description: "Review complete — consult healthcare professional for confirmation",
      status: hasGovernance ? "active" : "pending",
      icon: "fa-circle-check",
    },
  ];

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={() => setExpanded(!expanded)}>
        <div className="ucw-section-icon" style={{ background: "rgba(0,245,200,0.1)", color: theme.colors.accent.primary }}>
          <i className="fas fa-timeline" />
        </div>
        <div className="ucw-section-title">Investigation Flow</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(0,245,200,0.08)", color: theme.colors.accent.primary,
          border: `1px solid rgba(0,245,200,0.15)`,
        }}>
          {milestones.filter(m => m.status === "completed").length}/{milestones.length} steps
        </span>
        <i className={`fas fa-chevron-down ucw-section-chevron ${expanded ? "expanded" : ""}`} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div className="ucw-section-body">
              <div className="ucw-timeline">
                {milestones.map((ms, i) => (
                  <motion.div
                    key={ms.id}
                    className="ucw-timeline-item"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                  >
                    <div className={`ucw-timeline-dot ${ms.status}`} />
                    <div>
                      <div className="ucw-timeline-label" style={{
                        color: ms.status === "pending" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)",
                      }}>
                        <i className={`fas ${ms.icon}`} style={{
                          marginRight: 6, fontSize: "0.6rem",
                          color: ms.status === "active"
                            ? theme.colors.accent.primary
                            : ms.status === "completed"
                              ? "rgba(0,245,200,0.5)"
                              : "rgba(255,255,255,0.2)",
                        }} />
                        {ms.label}
                      </div>
                      <div className="ucw-timeline-desc">{ms.description}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
