/**
 * ConfidenceEvolutionGraph — UI Component showing animated confidence
 * evolution over time. Displays raw vs. governed confidence with
 * moderation annotations. Collapsible, progressive disclosure.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

interface ConfidencePoint {
  turn: number;
  timestamp: number;
  confidence: number;
  rank: number;
}

interface Props {
  conditionHistory: ConfidencePoint[];
  conditionName: string;
  governedConfidence?: number;
}

export default function ConfidenceEvolutionGraph({ conditionHistory, conditionName, governedConfidence }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (conditionHistory.length === 0) return null;

  const maxConf = Math.max(...conditionHistory.map(p => p.confidence), 100);
  const latestConf = conditionHistory[conditionHistory.length - 1]?.confidence || 0;
  const trend = conditionHistory.length >= 2
    ? conditionHistory[conditionHistory.length - 1].confidence - conditionHistory[conditionHistory.length - 2].confidence
    : 0;

  return (
    <div style={{
      background: "rgba(10, 14, 14, 0.5)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 10,
      overflow: "hidden",
      marginTop: 6,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", cursor: "pointer", background: "rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i className="fas fa-chart-line" style={{ fontSize: "0.55rem", color: theme.colors.accent.primary }} />
          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            {conditionName}
          </span>
          <span style={{
            fontSize: "0.5rem", fontWeight: 700,
            color: latestConf >= 70 ? theme.colors.health.recovery.DEFAULT : latestConf >= 40 ? theme.colors.health.warning.DEFAULT : "rgba(255,255,255,0.4)",
          }}>
            {latestConf.toFixed(0)}%
          </span>
          {trend !== 0 && (
            <span style={{
              fontSize: "0.45rem",
              color: trend > 0 ? theme.colors.health.recovery.DEFAULT : theme.colors.health.strain.DEFAULT,
            }}>
              {trend > 0 ? "↑" : "↓"}{Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </div>
        <i className="fas fa-chevron-down" style={{
          fontSize: "0.45rem", color: "rgba(255,255,255,0.3)",
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
            <div style={{ padding: "10px 12px" }}>
              {/* Mini graph */}
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 2,
                height: 50, padding: "4px 0",
              }}>
                {conditionHistory.map((point, i) => {
                  const height = (point.confidence / maxConf) * 100;
                  const isLatest = i === conditionHistory.length - 1;
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      style={{
                        flex: 1,
                        background: isLatest
                          ? theme.colors.accent.primary
                          : `rgba(0, 245, 200, ${0.15 + (i / conditionHistory.length) * 0.35})`,
                        borderRadius: "2px 2px 0 0",
                        minWidth: 4,
                        maxWidth: 20,
                        position: "relative",
                      }}
                      title={`Turn ${point.turn}: ${point.confidence.toFixed(0)}%`}
                    />
                  );
                })}
              </div>

              {/* Governed vs Raw */}
              {governedConfidence !== undefined && governedConfidence !== latestConf && (
                <div style={{
                  display: "flex", gap: 12, marginTop: 8,
                  fontSize: "0.48rem", color: "rgba(255,255,255,0.5)",
                }}>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Raw: </span>
                    <span style={{ fontWeight: 700 }}>{latestConf.toFixed(0)}%</span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Governed: </span>
                    <span style={{ fontWeight: 700, color: theme.colors.accent.primary }}>{governedConfidence.toFixed(0)}%</span>
                  </div>
                  <div style={{ color: theme.colors.health.warning.DEFAULT }}>
                    <i className="fas fa-shield-check" style={{ fontSize: "0.4rem", marginRight: 3 }} />
                    Moderated
                  </div>
                </div>
              )}

              {/* Turn details */}
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                {conditionHistory.slice(-5).reverse().map((point, i) => (
                  <div key={i} style={{
                    fontSize: "0.45rem", color: "rgba(255,255,255,0.4)",
                    display: "flex", gap: 8,
                  }}>
                    <span style={{ width: 40, color: "rgba(255,255,255,0.25)" }}>Turn {point.turn}</span>
                    <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{point.confidence.toFixed(0)}%</span>
                    <span>Rank #{point.rank}</span>
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
