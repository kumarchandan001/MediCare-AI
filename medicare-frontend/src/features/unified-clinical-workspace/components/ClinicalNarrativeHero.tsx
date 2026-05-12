/**
 * ClinicalNarrativeHero — AI-generated narrative summary of the investigation
 * Replaces raw percentage display with calm clinical storytelling
 */
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";

export default function ClinicalNarrativeHero() {
  const {
    predictionResult, governance, emotionalSafety,
    governedConfidence, evidenceStrength,
  } = useInvestigation();

  if (!predictionResult) return null;

  const disease = predictionResult.predicted_disease;
  const raw = predictionResult.confidence;
  const governed = governedConfidence;
  const wasAdjusted = governance?.confidence_adjustments && governance.confidence_adjustments.length > 0;
  const adjustmentReasons = wasAdjusted ? governance!.confidence_adjustments[0]?.reasons || [] : [];

  // Build narrative text
  const narrative = emotionalSafety?.calm_narrative ||
    buildNarrative(disease, governed, evidenceStrength, predictionResult.matched_symptoms);

  // Confidence ring percentage for SVG
  const ringPct = Math.min(governed, 100);
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (ringPct / 100) * circumference;
  const ringColor = governed >= 70 ? theme.colors.health.recovery.DEFAULT
    : governed >= 40 ? theme.colors.health.warning.DEFAULT
    : theme.colors.health.strain.DEFAULT;

  return (
    <motion.div
      className="ucw-narrative"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="ucw-narrative-label">
        <span className="pulse-dot" />
        Clinical Investigation Summary
      </div>

      <div className="ucw-narrative-text">{narrative}</div>

      <div className="ucw-narrative-finding">
        {/* Confidence ring */}
        <div className="ucw-confidence-ring">
          <svg viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <motion.circle
              cx="22" cy="22" r="20" fill="none"
              stroke={ringColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              transform="rotate(-90 22 22)"
            />
          </svg>
          <span className="ucw-confidence-value">{governed.toFixed(0)}%</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ucw-narrative-finding-name">{disease}</div>
          <div className="ucw-narrative-finding-meta">
            Evidence: {evidenceStrength}
            {wasAdjusted && (
              <span style={{ color: theme.colors.accent.primary, marginLeft: 8 }}>
                • Governance adjusted ({raw.toFixed(0)}% → {governed.toFixed(0)}%)
              </span>
            )}
          </div>
          {adjustmentReasons.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {adjustmentReasons.slice(0, 3).map((r, i) => (
                <span key={i} style={{
                  fontSize: "0.55rem", padding: "1px 6px", borderRadius: 6,
                  background: "rgba(0,245,200,0.06)", color: "rgba(0,245,200,0.7)",
                  border: "1px solid rgba(0,245,200,0.1)",
                }}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function buildNarrative(disease: string, confidence: number, strength: string, matched: string[]): string {
  const symptomText = matched.slice(0, 3)
    .map(s => s.replace(/_/g, " ").toLowerCase())
    .join(", ");

  const certaintyPhrase = confidence >= 70
    ? "The evidence pattern suggests a strong possibility of"
    : confidence >= 40
      ? "Based on available evidence, there is a moderate indication of"
      : "Initial investigation shows some early indicators consistent with";

  return `${certaintyPhrase} ${disease}. Your reported symptoms — ${symptomText} — form a ${strength.toLowerCase()} evidence cluster. This is an ongoing investigation and not a diagnosis. The system continues to evaluate all possibilities.`;
}
