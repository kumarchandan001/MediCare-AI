/**
 * InvestigationFlowController — Controls phase transitions with smooth animations.
 * Routes between Intake (conversation), Analyzing, and Investigation phases.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useInvestigation } from "./InvestigationStateProvider";
import ConversationalIntakeView from "./components/ConversationalIntakeView";
import AnalyzingPhaseOverlay from "./components/AnalyzingPhaseOverlay";
import InvestigationResultsView from "./components/InvestigationResultsView";

export default function InvestigationFlowController() {
  const { phase } = useInvestigation();

  return (
    <AnimatePresence mode="wait">
      {/* ═══ INTAKE PHASE — Conversational interview ═══ */}
      {phase === "intake" && (
        <motion.div
          key="intake"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <ConversationalIntakeView />
        </motion.div>
      )}

      {/* ═══ ANALYZING PHASE — Cinematic loading ═══ */}
      {phase === "analyzing" && (
        <motion.div
          key="analyzing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="ucw-section"
        >
          <AnalyzingPhaseOverlay />
        </motion.div>
      )}

      {/* ═══ INVESTIGATION PHASE — Results workspace ═══ */}
      {phase === "investigation" && (
        <motion.div
          key="investigation"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <InvestigationResultsView />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
