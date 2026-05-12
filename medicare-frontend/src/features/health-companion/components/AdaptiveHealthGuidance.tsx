/**
 * AdaptiveHealthGuidance — Contextual, non-prescriptive health suggestions.
 * Adapts based on recovery state, wearable drift, and emotional context.
 * Feels supportive, not controlling or overly directive.
 */
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useCompanion } from "../CompanionStateProvider";
import { useHealthCompanion } from "../HealthCompanionEngine";
import { useTemporalHealth } from "@/features/longitudinal-health/TemporalHealthStateProvider";

export default function AdaptiveHealthGuidance({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const companion = useCompanion();
  const engine = useHealthCompanion();
  const temporal = useTemporalHealth();

  const context = temporal.activeRecovery ? "recovery" : temporal.totalInvestigations > 0 ? "monitoring" : "idle";
  const tips = engine.generateGuidance(context);
  const followUp = engine.generateFollowUpMessage();

  if (companion.isNewUser && temporal.totalInvestigations === 0) return null;

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={onToggle}>
        <div className="ucw-section-icon" style={{ background: "rgba(0,230,118,0.1)", color: theme.colors.health.recovery.DEFAULT }}>
          <i className="fas fa-seedling" />
        </div>
        <div className="ucw-section-title">Health Guidance</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(0,230,118,0.08)", color: theme.colors.health.recovery.DEFAULT,
          border: "1px solid rgba(0,230,118,0.15)",
        }}>
          {companion.currentTone}
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
            <div className="ucw-section-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Companion follow-up message */}
              <div className="hc-guidance-followup">
                <div className="hc-guidance-followup-icon">
                  <i className="fas fa-comments" />
                </div>
                <div className="hc-guidance-followup-text">{followUp}</div>
              </div>

              {/* Supportive tips */}
              {tips.map((tip, i) => (
                <motion.div
                  key={i}
                  className="hc-guidance-tip"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <i className="fas fa-leaf" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.5rem", flexShrink: 0, marginTop: 2 }} />
                  <span>{tip}</span>
                </motion.div>
              ))}

              {/* Escalation message if needed */}
              {temporal.activeRecovery && temporal.activeRecovery.trend === "declining" && (
                <div className="hc-guidance-concern">
                  <i className="fas fa-hand-holding-medical" style={{ color: theme.colors.health.warning.DEFAULT, fontSize: "0.55rem" }} />
                  <span>{engine.generateEscalationMessage("routine")}</span>
                </div>
              )}

              <div className="hc-guidance-disclaimer">
                These are observations, not medical advice. Always consult a healthcare professional for clinical decisions.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
