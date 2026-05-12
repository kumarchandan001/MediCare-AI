/**
 * BelievabilityIndicators — Compact, calming visual signals that show
 * the user how medically believable the current reasoning is.
 * Shows: confidence stability, evidence sufficiency, temporal coherence,
 * wearable reliability, and uncertainty honesty.
 */
import { motion } from "framer-motion";
import { theme } from "@/config/theme";

interface IndicatorData {
  label: string;
  value: number;    // 0-100
  icon: string;
  status: "strong" | "moderate" | "cautious";
}

interface Props {
  confidenceStability: number;
  evidenceSufficiency: number;
  temporalCoherence: number;
  wearableReliability: number;
  uncertaintyScore: number;
  escalationModerated: boolean;
}

export default function BelievabilityIndicators({
  confidenceStability,
  evidenceSufficiency,
  temporalCoherence,
  wearableReliability,
  uncertaintyScore,
  escalationModerated,
}: Props) {
  const indicators: IndicatorData[] = [
    {
      label: "Reasoning",
      value: confidenceStability,
      icon: "fa-brain",
      status: confidenceStability >= 70 ? "strong" : confidenceStability >= 40 ? "moderate" : "cautious",
    },
    {
      label: "Evidence",
      value: evidenceSufficiency,
      icon: "fa-flask",
      status: evidenceSufficiency >= 70 ? "strong" : evidenceSufficiency >= 40 ? "moderate" : "cautious",
    },
    {
      label: "Coherence",
      value: temporalCoherence,
      icon: "fa-timeline",
      status: temporalCoherence >= 70 ? "strong" : temporalCoherence >= 40 ? "moderate" : "cautious",
    },
    {
      label: "Wearable",
      value: wearableReliability,
      icon: "fa-watch",
      status: wearableReliability >= 70 ? "strong" : wearableReliability >= 40 ? "moderate" : "cautious",
    },
  ];

  const statusColors: Record<string, string> = {
    strong: theme.colors.health.recovery.DEFAULT,
    moderate: theme.colors.health.warning.DEFAULT,
    cautious: theme.colors.health.strain.DEFAULT,
  };

  const overallScore = Math.round(
    (confidenceStability + evidenceSufficiency + temporalCoherence + wearableReliability) / 4
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{
        background: "rgba(10, 15, 15, 0.5)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: "12px 16px",
        marginTop: 8,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-shield-check" style={{ color: theme.colors.accent.primary, fontSize: "0.7rem" }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            Clinical Believability
          </span>
        </div>
        <div style={{
          fontSize: "0.58rem",
          fontWeight: 800,
          color: overallScore >= 70 ? statusColors.strong : overallScore >= 40 ? statusColors.moderate : statusColors.cautious,
          background: `${overallScore >= 70 ? statusColors.strong : overallScore >= 40 ? statusColors.moderate : statusColors.cautious}12`,
          padding: "2px 8px",
          borderRadius: 6,
        }}>
          {overallScore}%
        </div>
      </div>

      {/* Indicator bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {indicators.map(ind => (
          <div key={ind.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className={`fas ${ind.icon}`} style={{
              fontSize: "0.5rem",
              color: statusColors[ind.status],
              opacity: 0.7,
              width: 14,
              textAlign: "center",
            }} />
            <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.5)", width: 56, flexShrink: 0 }}>
              {ind.label}
            </span>
            <div style={{
              flex: 1,
              height: 3,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${ind.value}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                  height: "100%",
                  background: statusColors[ind.status],
                  borderRadius: 2,
                  opacity: 0.7,
                }}
              />
            </div>
            <span style={{ fontSize: "0.48rem", color: statusColors[ind.status], width: 24, textAlign: "right", fontWeight: 700 }}>
              {ind.value}
            </span>
          </div>
        ))}
      </div>

      {/* Uncertainty & Escalation notes */}
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {uncertaintyScore > 40 && (
          <div style={{
            fontSize: "0.48rem",
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(255,200,50,0.08)",
            color: "rgba(255,200,50,0.7)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <i className="fas fa-circle-question" style={{ fontSize: "0.4rem" }} />
            Uncertainty acknowledged
          </div>
        )}
        {escalationModerated && (
          <div style={{
            fontSize: "0.48rem",
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(0,245,200,0.06)",
            color: "rgba(0,245,200,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <i className="fas fa-shield-heart" style={{ fontSize: "0.4rem" }} />
            Escalation moderated
          </div>
        )}
      </div>
    </motion.div>
  );
}
