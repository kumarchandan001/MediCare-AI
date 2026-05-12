/**
 * CompanionPresenceLayer — The humanized ambient companion presence.
 * Replaces the clinical "Monitoring Heartbeat" with a warm, familiar
 * companion greeting and contextual awareness indicator.
 * Feels supportive, not surveillance-heavy.
 */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useCompanion } from "../CompanionStateProvider";
import { useHealthCompanion } from "../HealthCompanionEngine";

export default function CompanionPresenceLayer() {
  const companion = useCompanion();
  const engine = useHealthCompanion();
  const hasGreetedRef = useRef(false);

  // Generate greeting on first mount per session
  useEffect(() => {
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      companion.incrementInteraction("session");
      companion.addCompanionMessage({
        text: engine.generateGreeting(),
        type: "greeting",
        tone: companion.currentTone,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toneIcons: Record<string, string> = {
    warm: "fa-hand-holding-heart",
    calm: "fa-leaf",
    attentive: "fa-eye",
    supportive: "fa-hands-holding",
    reassuring: "fa-shield-heart",
  };

  const familiarityBadge: Record<string, string> = {
    new: "Getting to know you",
    acquainted: "Building understanding",
    familiar: "Health partner",
    trusted: "Trusted companion",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0.2, 1] }}
      className="hc-presence"
    >
      {/* Companion avatar */}
      <div className="hc-presence-avatar">
        <div className="hc-presence-avatar-inner">
          <i className={`fas ${toneIcons[companion.currentTone] || "fa-hand-holding-heart"}`} />
        </div>
        <span className="hc-presence-pulse" />
      </div>

      {/* Greeting and context */}
      <div className="hc-presence-content">
        <div className="hc-presence-greeting">{companion.timeAwareGreeting}</div>
        <div className="hc-presence-meta">
          <span className="hc-presence-familiarity">
            {familiarityBadge[companion.familiarityLevel]}
          </span>
          <span className="hc-presence-separator">·</span>
          <span className="hc-presence-tone">
            {companion.currentTone} mode
          </span>
        </div>
      </div>
    </motion.div>
  );
}
