/**
 * ReasoningAuditTrail — Transparency UI for Clinical Realism.
 * Shows developers (and advanced users) how confidence was smoothed,
 * why escalation was moderated, and if wearables were penalized.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useReasoningConsistency, ConfidenceSnapshot } from "../ReasoningConsistencyTracker";

export default function ReasoningAuditTrail() {
  const [expanded, setExpanded] = useState(false);
  const consistency = useReasoningConsistency();
  const history = consistency.getAuditHistory();

  if (history.length === 0) return null;

  return (
    <div className="cr-audit-panel">
      <div 
        className="cr-audit-header" 
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-shield-check" style={{ color: theme.colors.health.recovery.DEFAULT }} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            Clinical Realism Audit
          </span>
        </div>
        <i className={`fas fa-chevron-down ${expanded ? "expanded" : ""}`} style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", transition: "transform 0.3s" }} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div className="cr-audit-body">
              <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                Recent Confidence Moderations:
              </div>
              
              <div className="cr-audit-list">
                {history.slice(-5).reverse().map((entry: ConfidenceSnapshot, i: number) => (
                  <div key={i} className="cr-audit-item">
                    <div className="cr-audit-condition">{entry.condition}</div>
                    <div className="cr-audit-delta">
                      <span className="raw-conf">{entry.rawConfidence}%</span>
                      <i className="fas fa-arrow-right" style={{ fontSize: "0.45rem", margin: "0 6px" }} />
                      <span className="smooth-conf">{entry.smoothedConfidence}%</span>
                    </div>
                    <div className="cr-audit-reason">{entry.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
