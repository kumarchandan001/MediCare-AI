/**
 * TrustRefinementLayer — Visual indicators of AI caution.
 * Shows the user when confidence is capped due to sparse evidence
 * or when escalation is moderated for safety.
 */
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

interface Props {
  disclosure?: string;
  isModerated: boolean;
  wearablePenalty: boolean;
}

export default function TrustRefinementLayer({ disclosure, isModerated, wearablePenalty }: Props) {
  if (!disclosure && !isModerated && !wearablePenalty) return null;

  return (
    <div className="cr-trust-layer">
      <AnimatePresence>
        {disclosure && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="cr-trust-badge"
          >
            <i className="fas fa-scale-balanced" />
            <span>{disclosure}</span>
          </motion.div>
        )}

        {isModerated && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="cr-trust-badge"
          >
            <i className="fas fa-shield-heart" style={{ color: theme.colors.health.recovery.DEFAULT }} />
            <span>Escalation paused for careful observation.</span>
          </motion.div>
        )}

        {wearablePenalty && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="cr-trust-badge"
          >
            <i className="fas fa-watch" style={{ color: theme.colors.health.sleep.DEFAULT }} />
            <span>Wearable data influence reduced due to signal variance.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
