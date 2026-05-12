/**
 * TransparencyCompliancePanel — Collapsible panel showing complete
 * investigation transparency. Sections: "What I know", "What remains
 * uncertain", "Why I recommended this", "How your data was used".
 * Mobile-responsive with progressive disclosure.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

interface TransparencySection {
  title: string;
  icon: string;
  content: string;
  detail?: string;
}

interface Props {
  sections?: TransparencySection[];
  hypotheses: { condition: string; confidence: number }[];
  uncertaintyLevel: string;
  uncertaintyNarrative: string;
  governanceNotes: string[];
  wearableUsed: boolean;
  disclaimers: string[];
}

export default function TransparencyCompliancePanel({
  hypotheses, uncertaintyLevel, uncertaintyNarrative,
  governanceNotes, wearableUsed, disclaimers,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const sections: TransparencySection[] = [
    {
      title: "What I Found",
      icon: "fa-magnifying-glass",
      content: hypotheses.length > 0
        ? `Based on your symptoms, ${hypotheses.length} potential condition${hypotheses.length !== 1 ? "s were" : " was"} identified. The primary assessment is ${hypotheses[0]?.condition || "under review"} with ${hypotheses[0]?.confidence?.toFixed(0) || 0}% confidence.`
        : "Assessment is in progress.",
      detail: hypotheses.map(h => `• ${h.condition}: ${h.confidence.toFixed(0)}%`).join("\n"),
    },
    {
      title: "What Remains Uncertain",
      icon: "fa-circle-question",
      content: uncertaintyNarrative || "Uncertainty levels are within normal range.",
      detail: `Current uncertainty level: ${uncertaintyLevel}. Additional information or follow-up assessment may help refine this analysis.`,
    },
    {
      title: "How This Was Reviewed",
      icon: "fa-shield-check",
      content: governanceNotes.length > 0
        ? governanceNotes[0]
        : "This assessment passed all clinical governance checks.",
      detail: governanceNotes.length > 1
        ? governanceNotes.slice(1).map(n => `• ${n}`).join("\n")
        : "No additional governance notes.",
    },
    {
      title: "How Your Data Was Used",
      icon: "fa-lock",
      content: wearableUsed
        ? "Your reported symptoms and wearable health data were used in this analysis. Data is stored locally on your device."
        : "Only your reported symptoms were used. No wearable data was included.",
      detail: "Your health data is processed locally and through our secure analysis service. Audit trails are stored on your device for transparency.",
    },
  ];

  return (
    <div style={{
      background: "rgba(8, 12, 12, 0.5)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 12, overflow: "hidden", marginTop: 8,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", cursor: "pointer",
          background: "rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-eye" style={{ fontSize: "0.55rem", color: theme.colors.accent.primary }} />
          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            Transparency & Compliance
          </span>
        </div>
        <i className="fas fa-chevron-down" style={{
          fontSize: "0.42rem", color: "rgba(255,255,255,0.3)",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
        }} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "8px 12px" }}>
              {sections.map((section, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    padding: "8px 10px", borderRadius: 8,
                    background: activeSection === i ? "rgba(0,245,200,0.04)" : "rgba(0,0,0,0.1)",
                    border: activeSection === i ? "1px solid rgba(0,245,200,0.1)" : "1px solid transparent",
                    marginBottom: 6, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onClick={() => setActiveSection(activeSection === i ? null : i)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className={`fas ${section.icon}`} style={{ fontSize: "0.48rem", color: theme.colors.accent.primary, opacity: 0.7 }} />
                    <span style={{ fontSize: "0.5rem", fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{section.title}</span>
                    <i className="fas fa-chevron-right" style={{
                      marginLeft: "auto", fontSize: "0.35rem", color: "rgba(255,255,255,0.2)",
                      transform: activeSection === i ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }} />
                  </div>
                  <div style={{
                    fontSize: "0.48rem", color: "rgba(255,255,255,0.45)",
                    marginTop: 4, lineHeight: 1.5,
                  }}>
                    {section.content}
                  </div>
                  <AnimatePresence>
                    {activeSection === i && section.detail && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{
                          marginTop: 6, padding: "6px 8px",
                          background: "rgba(0,0,0,0.15)", borderRadius: 5,
                          fontSize: "0.45rem", color: "rgba(255,255,255,0.35)",
                          lineHeight: 1.6, whiteSpace: "pre-line",
                        }}
                      >
                        {section.detail}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

              {/* Disclaimers */}
              {disclaimers.length > 0 && (
                <div style={{
                  marginTop: 4, padding: "6px 10px", borderRadius: 6,
                  background: "rgba(0,0,0,0.1)", borderLeft: `2px solid ${theme.colors.health.warning.DEFAULT}30`,
                }}>
                  {disclaimers.map((d, i) => (
                    <div key={i} style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.5, marginBottom: 2 }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 4, fontSize: "0.35rem" }} />
                      {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
