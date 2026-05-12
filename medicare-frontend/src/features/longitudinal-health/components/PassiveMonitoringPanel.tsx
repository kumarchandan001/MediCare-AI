/**
 * PassiveMonitoringPanel — The intelligent idle state with companion layer.
 * Now powered by the HealthCompanion for warm, humanized presence.
 * Feels aware, supportive, and personalized—never empty or clinical.
 */
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useTemporalHealth } from "../TemporalHealthStateProvider";
import CompanionPresenceLayer from "@/features/health-companion/components/CompanionPresenceLayer";
import HumanizedJourneyNarrator from "@/features/health-companion/components/HumanizedJourneyNarrator";
import DailyHealthCheckin from "./DailyHealthCheckin";

interface Props {
  onStartInvestigation: () => void;
}

export default function PassiveMonitoringPanel({ onStartInvestigation }: Props) {
  const temporal = useTemporalHealth();
  const hasHistory = temporal.totalInvestigations > 0;
  const hasRecovery = !!temporal.activeRecovery;
  const hasPatterns = temporal.recurringPatterns.filter(p => p.severity !== "mild").length > 0;
  const hasPendingFollowUps = temporal.hasActiveFollowUps;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="lh-passive-panel"
    >
      {/* ═══ Companion presence (replaces clinical heartbeat) ═══ */}
      <CompanionPresenceLayer />

      {/* ═══ Humanized health narrative ═══ */}
      <HumanizedJourneyNarrator />

      {/* Active recovery card */}
      {hasRecovery && temporal.activeRecovery && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lh-passive-recovery-card"
        >
          <div className="lh-passive-recovery-header">
            <i className="fas fa-heart-pulse" style={{ color: theme.colors.health.recovery.DEFAULT, fontSize: "0.65rem" }} />
            <span>Recovery Tracking</span>
          </div>
          <div className="lh-passive-recovery-body">
            <div className="lh-passive-recovery-condition">{temporal.activeRecovery.activeCondition}</div>
            <div className="lh-passive-recovery-meta">
              Day {temporal.activeRecovery.currentDay} · Stability: {temporal.activeRecovery.stabilityScore}%
            </div>
            <div className="lh-passive-milestones">
              {temporal.activeRecovery.milestones.map((m, i) => (
                <div key={i} className={`lh-passive-milestone ${m.reached ? "reached" : ""}`} title={m.label}>
                  <div className="lh-passive-milestone-dot" />
                  <span className="lh-passive-milestone-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Pending follow-ups */}
      {hasPendingFollowUps && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lh-passive-followup-card"
        >
          {temporal.pendingFollowUps.slice(0, 2).map(fu => (
            <div key={fu.id} className="lh-passive-followup-item">
              <div className="lh-passive-followup-icon">
                <i className="fas fa-calendar-check" />
              </div>
              <div className="lh-passive-followup-info">
                <div className="lh-passive-followup-condition">{fu.condition}</div>
                <div className="lh-passive-followup-due">
                  {fu.urgency === "overdue" ? "Overdue" : `Due: ${fu.dueDate}`} · {fu.reason}
                </div>
              </div>
              <button onClick={onStartInvestigation} className="lh-passive-followup-btn">
                Follow up
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* Recurring patterns notice */}
      {hasPatterns && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lh-passive-pattern-notice"
        >
          <i className="fas fa-repeat" style={{ color: theme.colors.health.sleep.DEFAULT, fontSize: "0.6rem" }} />
          <span>
            {temporal.recurringPatterns.filter(p => p.severity !== "mild").length} recurring pattern{temporal.recurringPatterns.filter(p => p.severity !== "mild").length > 1 ? "s" : ""} being tracked
          </span>
        </motion.div>
      )}

      {/* Daily check-in */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <DailyHealthCheckin />
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="lh-passive-actions"
      >
        <motion.button
          onClick={onStartInvestigation}
          className="lh-passive-investigate-btn"
          whileHover={{ y: -2, boxShadow: "0 0 30px rgba(0,245,200,0.2)" }}
          whileTap={{ scale: 0.98 }}
        >
          <i className="fas fa-stethoscope" />
          {hasHistory ? "New Investigation" : "Begin Investigation"}
        </motion.button>
      </motion.div>

      {/* Longitudinal trust footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="lh-passive-trust"
      >
        <div className="lh-passive-trust-item">
          <span className="lh-passive-trust-value">{temporal.daysMonitored}d</span>
          <span className="lh-passive-trust-label">Together</span>
        </div>
        <div className="lh-passive-trust-item">
          <span className="lh-passive-trust-value">{temporal.totalInvestigations}</span>
          <span className="lh-passive-trust-label">Investigations</span>
        </div>
        <div className="lh-passive-trust-item">
          <span className="lh-passive-trust-value">{temporal.dailyStatuses.length}</span>
          <span className="lh-passive-trust-label">Check-ins</span>
        </div>
        <div className="lh-passive-trust-item">
          <span className="lh-passive-trust-value">{temporal.recurringPatterns.length}</span>
          <span className="lh-passive-trust-label">Patterns</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
