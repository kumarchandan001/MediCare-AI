/**
 * ClinicalStorytellingPanel — Narrates investigation progression
 * Provides evolving clinical understanding, not AI status reporting.
 * Emotionally safe, calm, medically thoughtful tone.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";

const typeIcons: Record<string, { icon: string; color: string; label: string }> = {
  progression: { icon: "fa-chart-line", color: theme.colors.accent.primary, label: "Investigation Update" },
  recovery: { icon: "fa-heart-pulse", color: theme.colors.health.recovery.DEFAULT, label: "Recovery Signal" },
  deterioration: { icon: "fa-arrow-trend-down", color: theme.colors.health.warning.DEFAULT, label: "Monitoring Alert" },
  confidence_shift: { icon: "fa-scale-balanced", color: theme.colors.health.strain.DEFAULT, label: "Confidence Change" },
  continuity: { icon: "fa-link", color: theme.colors.health.sleep.DEFAULT, label: "Longitudinal Insight" },
};

export default function ClinicalStorytellingPanel({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { storyEntries, predictionResult, longitudinalHistory, monitoringPulse } = useInvestigation();

  if (!predictionResult) return null;

  // Generate contextual narrative if no story entries
  const displayEntries = storyEntries.length > 0
    ? storyEntries
    : [{
      id: "default",
      timestamp: Date.now(),
      type: "progression" as const,
      narrative: buildDefaultNarrative(
        predictionResult.predicted_disease,
        predictionResult.confidence,
        predictionResult.matched_symptoms || [],
        longitudinalHistory.length,
        monitoringPulse.trend,
      ),
    }];

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={onToggle}>
        <div className="ucw-section-icon" style={{
          background: "rgba(0,245,200,0.1)",
          color: theme.colors.accent.primary,
        }}>
          <i className="fas fa-book-medical" />
        </div>
        <div className="ucw-section-title">Clinical Narrative</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(0,245,200,0.08)",
          color: theme.colors.accent.primary,
          border: "1px solid rgba(0,245,200,0.15)",
        }}>
          {displayEntries.length} insight{displayEntries.length > 1 ? "s" : ""}
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
              {displayEntries.map((entry, i) => {
                const meta = typeIcons[entry.type] || typeIcons.progression;
                return (
                  <motion.div
                    key={entry.id}
                    className="ucw-story-entry"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `${meta.color}06`,
                      border: `1px solid ${meta.color}10`,
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${meta.color}12`, color: meta.color, fontSize: "0.7rem",
                    }}>
                      <i className={`fas ${meta.icon}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "0.6rem", fontWeight: 700, color: meta.color,
                        textTransform: "uppercase" as const, letterSpacing: "0.06em",
                        marginBottom: 4,
                      }}>
                        {meta.label}
                      </div>
                      <div style={{
                        fontSize: "0.72rem", color: "rgba(255,255,255,0.65)",
                        lineHeight: 1.65,
                      }}>
                        {entry.narrative}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Monitoring awareness pulse */}
              {monitoringPulse.isActive && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", borderRadius: 8,
                  background: "rgba(24,31,27,0.4)",
                  border: "1px solid rgba(255,255,255,0.03)",
                }}>
                  <span className="ucw-monitoring-pulse" style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: theme.colors.accent.primary,
                    boxShadow: `0 0 6px ${theme.colors.accent.primary}60`,
                    animation: "ucw-pulse-soft 2.5s ease-in-out infinite",
                  }} />
                  <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)" }}>
                    Continuous monitoring active • System remains aware of your health context
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function buildDefaultNarrative(
  disease: string, confidence: number,
  symptoms: string[], priorCount: number, trend: string
): string {
  const symptomText = symptoms.slice(0, 3)
    .map(s => s.replace(/_/g, " ").toLowerCase())
    .join(", ");

  const certainty = confidence >= 70
    ? "The current evidence pattern forms a coherent cluster suggesting"
    : confidence >= 40
      ? "Available evidence points toward a moderate possibility of"
      : "Early-stage analysis reveals some indicators consistent with";

  const longitudinal = priorCount > 0
    ? ` Building on ${priorCount} prior investigation${priorCount > 1 ? "s" : ""}, the system maintains longitudinal awareness of your health trajectory.`
    : " This is your first investigation, establishing a baseline for ongoing monitoring.";

  const trendNote = trend === "improving"
    ? " Recent patterns suggest an improving trajectory."
    : trend === "worsening"
      ? " The system is monitoring a trend that warrants continued observation."
      : "";

  return `${certainty} ${disease}, informed by reported symptoms including ${symptomText}. ${longitudinal}${trendNote} The investigation continues to evaluate all possibilities transparently.`;
}
