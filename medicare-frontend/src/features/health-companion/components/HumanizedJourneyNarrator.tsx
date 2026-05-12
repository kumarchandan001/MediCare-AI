/**
 * HumanizedJourneyNarrator — Emotionally intelligent health narrative.
 * Replaces clinical summary text with warm, conversational,
 * longitudinally aware narratives. Feels human, not AI-generated.
 */
import { motion } from "framer-motion";
import { useHealthCompanion } from "../HealthCompanionEngine";
import { useCompanion } from "../CompanionStateProvider";

export default function HumanizedJourneyNarrator() {
  const engine = useHealthCompanion();
  const companion = useCompanion();
  const summary = engine.generateCompanionSummary();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="hc-narrator"
    >
      <div className="hc-narrator-label">
        <span className="hc-narrator-pulse" />
        Your Health Overview
      </div>
      <div className="hc-narrator-text">{summary}</div>

      {/* Supportive guidance */}
      {!companion.isNewUser && (
        <div className="hc-narrator-guidance">
          {engine.generateGuidance(
            companion.emotionalContext.userStressLevel === "high" ? "recovery" : "idle"
          ).map((tip, i) => (
            <div key={i} className="hc-narrator-tip">
              <i className="fas fa-seedling" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
