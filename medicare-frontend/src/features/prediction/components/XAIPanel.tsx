import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { theme } from "@/config/theme";
import type {
  XAIResult,
  FeatureContribution,
  RiskFactor,
  ConfidenceBreakdown,
} from "../types/prediction.types";

type XAITab = "explanation" | "impact" | "alternatives" | "risks";

const TABS: { key: XAITab; label: string; icon: string }[] = [
  { key: "explanation", label: "AI Explanation", icon: "fa-brain" },
  { key: "impact", label: "Symptom Impact", icon: "fa-chart-bar" },
  { key: "alternatives", label: "Alternatives", icon: "fa-list-check" },
  {
    key: "risks",
    label: "Risk Factors",
    icon: "fa-triangle-exclamation",
  },
];

const SEV_COLORS: Record<string, string> = {
  Critical: theme.colors.health.danger.DEFAULT,
  High: "#FF6D00",
  Moderate: theme.colors.health.warning.DEFAULT,
  Low: theme.colors.health.recovery.DEFAULT,
};

const RISK_COLORS: Record<string, string> = {
  critical: theme.colors.health.danger.DEFAULT,
  high: "#FF6D00",
  moderate: theme.colors.health.warning.DEFAULT,
};

const EVIDENCE_PCT: Record<string, number> = {
  "Very Strong": 95,
  Strong: 78,
  Moderate: 60,
  Weak: 38,
  "Very Weak": 20,
};

interface XAIPanelProps {
  xai: XAIResult;
  predictedDisease: string;
  confidence: number;
}

export function XAIPanel({
  xai,
  predictedDisease,
  confidence,
}: XAIPanelProps) {
  const [activeTab, setTab] = useState<XAITab>("explanation");

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          borderBottom: `1px solid ${theme.colors.border[1]}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: theme.colors.accent.primary }}
          />
          <span
            className="font-bold uppercase tracking-widest"
            style={{
              fontSize: theme.typography.sizes.xxs,
              color: theme.colors.text.subtle,
            }}
          >
            Explainable AI (XAI)
          </span>
        </div>
        <span
          className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{
            background: theme.colors.accent.subtle,
            color: theme.colors.accent.primary,
            border: `1px solid ${theme.colors.accent.border}`,
          }}
        >
          Score: {xai.explanation_score.toFixed(0)}
        </span>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-2 xai-tab-bar overflow-x-auto scrollbar-none"
        style={{
          background: theme.colors.surface[3],
          borderBottom: `1px solid ${theme.colors.border[1]}`,
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl flex-1 justify-center font-bold uppercase tracking-wider transition-all"
              style={{
                fontSize: theme.typography.sizes.xxs,
                fontFamily: theme.typography.fonts.primary,
                background: isActive
                  ? theme.colors.accent.primary
                  : "transparent",
                color: isActive
                  ? theme.colors.bg.primary
                  : theme.colors.text.subtle,
                boxShadow: isActive ? theme.shadows.accent : "none",
              }}
            >
              <i className={`fas ${tab.icon}`} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "explanation" && (
              <ExplanationTab xai={xai} />
            )}
            {activeTab === "impact" && (
              <ImpactTab contributions={xai.feature_contributions} />
            )}
            {activeTab === "alternatives" && (
              <AlternativesTab
                xai={xai}
                predictedDisease={predictedDisease}
                confidence={confidence}
              />
            )}
            {activeTab === "risks" && (
              <RisksTab riskFactors={xai.risk_factors} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── EXPLANATION TAB ─────────────────────

function ExplanationTab({ xai }: { xai: XAIResult }) {
  return (
    <div className="space-y-5">
      {/* Evidence strength bar */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: theme.colors.surface[3],
          border: `1px solid ${theme.colors.border[1]}`,
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <span
            className="font-bold uppercase tracking-widest"
            style={{
              fontSize: theme.typography.sizes.xxs,
              color: theme.colors.text.subtle,
            }}
          >
            Evidence Strength
          </span>
          <span
            className="font-bold"
            style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.accent.primary,
            }}
          >
            {xai.evidence_strength}
          </span>
        </div>
        <EvidenceBar strength={xai.evidence_strength} />
      </div>

      {/* XAI Summary */}
      <div
        className="p-5 rounded-xl"
        style={{
          background: theme.colors.accent.subtle,
          border: `1px solid ${theme.colors.accent.border}`,
          borderLeft: `4px solid ${theme.colors.accent.primary}`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: theme.colors.accent.primary }}
          >
            <i
              className="fas fa-brain text-sm"
              style={{ color: theme.colors.bg.primary }}
            />
          </div>
          <div>
            <div
              className="font-bold"
              style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.primary,
              }}
            >
              Why this prediction?
            </div>
            <div
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
              }}
            >
              AI Model Reasoning
            </div>
          </div>
        </div>
        <p
          style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.muted,
            lineHeight: 1.7,
          }}
        >
          {xai.xai_summary}
        </p>
      </div>

      {/* Confidence breakdown grid */}
      <ConfidenceGrid breakdown={xai.confidence_breakdown} />
    </div>
  );
}

// ── IMPACT TAB ──────────────────────────

function ImpactTab({
  contributions,
}: {
  contributions: FeatureContribution[];
}) {
  return (
    <div className="space-y-5">
      <ContributionChart contributions={contributions} />

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${theme.colors.border[1]}` }}
      >
        <div
          className="grid grid-cols-3 gap-3 px-5 py-3"
          style={{
            background: theme.colors.surface[3],
            borderBottom: `1px solid ${theme.colors.border[1]}`,
          }}
        >
          {["Symptom", "Severity", "Impact"].map((h) => (
            <span
              key={h}
              className="font-bold uppercase tracking-widest"
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {contributions.map((fc, i) => (
          <ContributionRow
            key={fc.symptom}
            fc={fc}
            isLast={i === contributions.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ── ALTERNATIVES TAB ────────────────────

function AlternativesTab({
  xai,
  predictedDisease,
  confidence,
}: {
  xai: XAIResult;
  predictedDisease: string;
  confidence: number;
}) {
  return (
    <div className="space-y-3">
      <div className="mb-1">
        <span
          className="font-bold uppercase tracking-widest"
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: theme.colors.text.subtle,
          }}
        >
          Primary Prediction
        </span>
      </div>
      <DiagnosisBar
        disease={predictedDisease}
        probability={confidence}
        color={theme.colors.accent.primary}
        isPrimary
      />

      {xai.alternative_diagnoses.length > 0 ? (
        <>
          <div className="mt-4 mb-1">
            <span
              className="font-bold uppercase tracking-widest"
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
              }}
            >
              Other Possibilities
            </span>
          </div>
          {xai.alternative_diagnoses.map((alt, i) => (
            <DiagnosisBar
              key={alt.disease}
              disease={alt.disease}
              probability={alt.probability}
              reason={alt.reason}
              color={
                [
                  theme.colors.health.strain.DEFAULT,
                  theme.colors.health.sleep.DEFAULT,
                  theme.colors.health.warning.DEFAULT,
                ][i]
              }
              delay={i * 0.1}
            />
          ))}
        </>
      ) : (
        <p
          className="text-center py-6"
          style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.subtle,
          }}
        >
          No significant alternative diagnoses detected.
        </p>
      )}

      <div
        className="flex items-center gap-2 mt-4 p-3 rounded-xl"
        style={{
          background: theme.colors.surface[3],
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.text.subtle,
          fontStyle: "italic",
        }}
      >
        <i className="fas fa-stethoscope" />
        Only a qualified doctor can confirm the actual diagnosis.
      </div>
    </div>
  );
}

// ── RISKS TAB ───────────────────────────

function RisksTab({ riskFactors }: { riskFactors: RiskFactor[] }) {
  if (riskFactors.length === 0) {
    return (
      <div
        className="flex items-center gap-3 p-5 rounded-xl"
        style={{
          background: theme.colors.health.recovery.bg,
          border: `1px solid ${theme.colors.health.recovery.border}`,
        }}
      >
        <i
          className="fas fa-circle-check text-2xl"
          style={{ color: theme.colors.health.recovery.DEFAULT }}
        />
        <p
          style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.muted,
            fontWeight: 600,
          }}
        >
          No high-risk symptoms detected. Good sign!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {riskFactors.map((rf, i) => (
        <RiskFactorCard key={rf.symptom} rf={rf} index={i} />
      ))}
    </div>
  );
}

// ── Sub-components ────────────────────────

function EvidenceBar({ strength }: { strength: string }) {
  const pct = EVIDENCE_PCT[strength] || 60;
  const color =
    pct >= 78
      ? theme.colors.health.recovery.DEFAULT
      : pct >= 60
        ? theme.colors.health.warning.DEFAULT
        : theme.colors.health.danger.DEFAULT;

  return (
    <div
      className="h-2 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      <motion.div
        className="h-full rounded-full"
        initial={{ width: "0%" }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </div>
  );
}

function ConfidenceGrid({
  breakdown,
}: {
  breakdown: ConfidenceBreakdown;
}) {
  // Support both v2 (overall/symptom_match/…) and v3 (display_confidence/…) engine outputs
  const cells = [
    {
      label: "Overall",
      value: breakdown.display_confidence ?? breakdown.overall,
    },
    {
      label: "Symptom Match",
      value: breakdown.symptom_match ?? breakdown.symptom_match_pct,
    },
    {
      label: "Pattern Strength",
      value: breakdown.pattern_strength,
    },
    {
      label: "Severity",
      value: breakdown.severity_alignment ?? breakdown.evidence_weight,
    },
  ].filter((c) => c.value != null) as { label: string; value: number }[];

  if (cells.length === 0) return null;

  return (
    <div className={`grid gap-3 ${cells.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="text-center p-4 rounded-xl"
          style={{
            background: theme.colors.surface[3],
            border: `1px solid ${theme.colors.border[1]}`,
          }}
        >
          <div
            className="font-black"
            style={{
              fontSize: theme.typography.sizes.metricMD,
              color: theme.colors.accent.primary,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {cell.value.toFixed(0)}%
          </div>
          <div
            className="mt-1 font-bold uppercase tracking-wider"
            style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}
          >
            {cell.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContributionChart({
  contributions,
}: {
  contributions: FeatureContribution[];
}) {
  const chartData = contributions.slice(0, 8).map((fc) => ({
    name:
      fc.display_name.length > 12
        ? fc.display_name.slice(0, 12) + "…"
        : fc.display_name,
    value: fc.severity_score,
    label: fc.severity_label,
  }));

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: theme.colors.surface[3],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div
        className="font-bold uppercase tracking-widest mb-4"
        style={{
          fontSize: theme.typography.sizes.xxs,
          color: theme.colors.text.subtle,
        }}
      >
        Severity Score by Symptom
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 7]}
            tick={{ fill: theme.colors.text.subtle, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: theme.colors.text.muted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              background: theme.colors.surface[4],
              border: `1px solid ${theme.colors.border[2]}`,
              borderRadius: "12px",
              color: theme.colors.text.muted,
              fontSize: "11px",
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  SEV_COLORS[entry.label] || theme.colors.accent.primary
                }
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ContributionRow({
  fc,
  isLast,
}: {
  fc: FeatureContribution;
  isLast: boolean;
}) {
  return (
    <div
      className="grid grid-cols-3 gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]"
      style={{
        borderBottom: isLast
          ? "none"
          : `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <span
        style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.text.secondary,
          fontWeight: 500,
        }}
      >
        {fc.display_name}
      </span>
      <span
        className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold uppercase tracking-wide w-fit"
        style={{
          fontSize: "0.6rem",
          background: `${SEV_COLORS[fc.severity_label]}18`,
          color: SEV_COLORS[fc.severity_label],
        }}
      >
        {fc.severity_label}
      </span>
      <span
        className="font-black text-right"
        style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.accent.primary,
        }}
      >
        {fc.contribution_pct.toFixed(1)}%
      </span>
    </div>
  );
}

function DiagnosisBar({
  disease,
  probability,
  reason,
  color,
  isPrimary = false,
  delay = 0,
}: {
  disease: string;
  probability: number;
  reason?: string;
  color: string;
  isPrimary?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: isPrimary
          ? theme.colors.accent.subtle
          : theme.colors.surface[3],
        border: isPrimary
          ? `1px solid ${theme.colors.accent.border}`
          : `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div className="flex items-center gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold truncate"
            style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.primary,
            }}
          >
            {disease}
          </div>
          {reason && (
            <div
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
                marginTop: "2px",
              }}
            >
              {reason}
            </div>
          )}
        </div>
        <span
          className="font-black flex-shrink-0"
          style={{
            fontSize: theme.typography.sizes.base,
            color: color,
          }}
        >
          {probability.toFixed(1)}%
        </span>
      </div>
      <div
        className="h-1 rounded-full"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${probability}%` }}
          transition={{
            duration: 0.8,
            delay: 0.3 + delay,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            background: color,
            boxShadow: `0 0 6px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}

function RiskFactorCard({
  rf,
  index,
}: {
  rf: RiskFactor;
  index: number;
}) {
  const color =
    RISK_COLORS[rf.level] || theme.colors.health.warning.DEFAULT;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-start gap-4 p-4 rounded-xl transition-transform hover:translate-x-1"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, color }}
      >
        <i className={`fas ${rf.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold mb-1"
          style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.primary,
          }}
        >
          {rf.display}
        </div>
        <div
          style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.text.muted,
            lineHeight: 1.5,
          }}
        >
          {rf.message}
        </div>
      </div>
      <span
        className="px-2 py-1 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
        style={{
          fontSize: "0.6rem",
          background: `${color}18`,
          color,
        }}
      >
        {rf.level}
      </span>
    </motion.div>
  );
}
