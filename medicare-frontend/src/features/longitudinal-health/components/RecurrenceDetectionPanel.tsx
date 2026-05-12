/**
 * RecurrenceDetectionPanel — Pattern-aware recurring symptom tracker.
 * Detects cyclical symptoms, repeated escalation pathways, and chronic patterns.
 * Calm, narrative-first, progressively disclosed.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useTemporalHealth } from "../TemporalHealthStateProvider";

export default function RecurrenceDetectionPanel({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { recurringPatterns, investigations } = useTemporalHealth();

  const meaningfulPatterns = recurringPatterns.filter(p => p.occurrences >= 2);
  if (meaningfulPatterns.length === 0) return null;

  const severityColors = {
    mild: "rgba(255,255,255,0.4)",
    moderate: theme.colors.health.warning.DEFAULT,
    concerning: theme.colors.health.strain.DEFAULT,
  };

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={onToggle}>
        <div className="ucw-section-icon" style={{ background: "rgba(255,179,0,0.1)", color: theme.colors.health.warning.DEFAULT }}>
          <i className="fas fa-repeat" />
        </div>
        <div className="ucw-section-title">Recurring Patterns</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(255,179,0,0.08)", color: theme.colors.health.warning.DEFAULT,
          border: "1px solid rgba(255,179,0,0.15)",
        }}>
          {meaningfulPatterns.length} pattern{meaningfulPatterns.length > 1 ? "s" : ""}
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
              {meaningfulPatterns.map((pattern, i) => {
                const color = severityColors[pattern.severity];
                const symptomName = pattern.symptomCluster
                  .map(s => s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()))
                  .join(", ");

                return (
                  <motion.div
                    key={pattern.id}
                    className="lh-pattern-card"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ borderColor: `${color}20` }}
                  >
                    <div className="lh-pattern-header">
                      <span className="lh-pattern-name">{symptomName}</span>
                      <span className="lh-pattern-count" style={{ color }}>
                        {pattern.occurrences}× reported
                      </span>
                    </div>
                    <div className="lh-pattern-narrative">
                      {pattern.occurrences >= 3
                        ? `This symptom has appeared ${pattern.occurrences} times since ${pattern.firstSeen}. The recurring nature suggests it warrants attention during your next clinical consultation.`
                        : `Noted ${pattern.occurrences} times. The system is monitoring for recurrence trends.`
                      }
                    </div>
                    <div className="lh-pattern-meta">
                      <span>First: {pattern.firstSeen}</span>
                      <span>Last: {pattern.lastSeen}</span>
                      <span style={{ color }}>
                        {pattern.severity === "concerning" ? "⚠ Recurring" : pattern.severity === "moderate" ? "Monitoring" : "Tracking"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              <div style={{
                fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.6,
                padding: "8px 10px", borderRadius: 8, background: "rgba(24,31,27,0.3)",
              }}>
                Pattern detection helps identify recurring health trends. Discuss any persistent patterns with your healthcare provider.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
