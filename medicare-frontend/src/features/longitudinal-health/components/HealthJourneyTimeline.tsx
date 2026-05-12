/**
 * HealthJourneyTimeline — Cinematic longitudinal investigation timeline.
 * Visualizes past investigations, escalation history, recovery milestones,
 * and daily continuity in a progressive, mobile-compressed layout.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useTemporalHealth } from "../TemporalHealthStateProvider";

export default function HealthJourneyTimeline({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { investigations, dailyStatuses, journeyNarratives, activeRecovery, recurringPatterns } = useTemporalHealth();
  const [showAll, setShowAll] = useState(false);

  if (investigations.length === 0 && dailyStatuses.length === 0) return null;

  // Build unified timeline entries
  type TimelineEntry = {
    id: string;
    timestamp: number;
    type: "investigation" | "checkin" | "narrative" | "recovery" | "pattern";
    title: string;
    subtitle: string;
    icon: string;
    color: string;
  };

  const entries: TimelineEntry[] = [];

  investigations.forEach(inv => {
    entries.push({
      id: inv.id,
      timestamp: inv.timestamp,
      type: "investigation",
      title: inv.primaryFinding,
      subtitle: `${inv.confidence.toFixed(0)}% confidence · ${inv.symptoms.length} symptoms · ${inv.escalationLevel}`,
      icon: "fa-microscope",
      color: theme.colors.accent.primary,
    });
  });

  // Add recent daily statuses (last 5)
  dailyStatuses.slice(-5).forEach(ds => {
    entries.push({
      id: `ds-${ds.date}`,
      timestamp: ds.timestamp,
      type: "checkin",
      title: `Daily Check-in: ${ds.mood === "good" ? "Good" : ds.mood === "poor" ? "Challenging" : "Steady"}`,
      subtitle: `Energy ${ds.energyLevel}% · Pain ${ds.painLevel}/10${ds.reportedSymptoms.length > 0 ? ` · ${ds.reportedSymptoms.length} symptom${ds.reportedSymptoms.length > 1 ? "s" : ""}` : ""}`,
      icon: "fa-clipboard-check",
      color: ds.mood === "good" ? theme.colors.health.recovery.DEFAULT : ds.mood === "poor" ? theme.colors.health.warning.DEFAULT : "rgba(255,255,255,0.5)",
    });
  });

  // Add recent narratives (last 3)
  journeyNarratives.slice(-3).forEach(jn => {
    entries.push({
      id: jn.id,
      timestamp: jn.timestamp,
      type: "narrative",
      title: jn.type.replace(/^\w/, c => c.toUpperCase()) + " Insight",
      subtitle: jn.text.length > 100 ? jn.text.slice(0, 100) + "…" : jn.text,
      icon: "fa-book-medical",
      color: theme.colors.health.sleep.DEFAULT,
    });
  });

  // Sort by timestamp descending
  entries.sort((a, b) => b.timestamp - a.timestamp);
  const displayEntries = showAll ? entries : entries.slice(0, 5);

  const typeIcons: Record<string, string> = {
    investigation: "fa-microscope",
    checkin: "fa-clipboard-check",
    narrative: "fa-book-medical",
    recovery: "fa-heart-pulse",
    pattern: "fa-repeat",
  };

  return (
    <div className="ucw-section">
      <div className="ucw-section-header" onClick={onToggle}>
        <div className="ucw-section-icon" style={{ background: "rgba(156,111,255,0.1)", color: theme.colors.health.sleep.DEFAULT }}>
          <i className="fas fa-timeline" />
        </div>
        <div className="ucw-section-title">Health Journey</div>
        <span className="ucw-section-badge" style={{
          background: "rgba(156,111,255,0.08)", color: theme.colors.health.sleep.DEFAULT,
          border: "1px solid rgba(156,111,255,0.15)",
        }}>
          {entries.length} events
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
              <div className="lh-journey-timeline">
                {displayEntries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    className="lh-journey-item"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                  >
                    <div className="lh-journey-dot" style={{
                      background: `${entry.color}25`,
                      borderColor: entry.color,
                    }}>
                      <i className={`fas ${entry.icon}`} style={{ color: entry.color, fontSize: "0.45rem" }} />
                    </div>
                    <div className="lh-journey-content">
                      <div className="lh-journey-title">{entry.title}</div>
                      <div className="lh-journey-subtitle">{entry.subtitle}</div>
                      <div className="lh-journey-time">
                        {new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {entries.length > 5 && !showAll && (
                <button onClick={() => setShowAll(true)} className="lh-journey-show-more">
                  Show {entries.length - 5} more events
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
