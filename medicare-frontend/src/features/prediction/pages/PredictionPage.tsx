import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";
import { usePrediction } from "../hooks/usePrediction";
import { CategoryPills } from "../components/CategoryPills";
import { SymptomGrid } from "../components/SymptomGrid";
import { ResultHero } from "../components/ResultHero";
import { XAIPanel } from "../components/XAIPanel";
import { ConsultSection } from "../components/ConsultSection";
import type { WHOAdjustment, LifestyleAdjustment, PredictionHistoryItem } from "../types/prediction.types";
import type { LifestyleState } from "../hooks/usePrediction";

function fmt(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function PredictionPage() {
  const {
    symptomsData, symptomsLoading, filteredSymptoms,
    categories, selectedSymptoms, toggleSymptom,
    removeSymptom, clearAll, searchQuery, setSearchQuery,
    activeCategory, setCategory,
    countries, selectedCountry, setSelectedCountry,
    lifestyle, showLifestyle, setShowLifestyle,
    toggleLifestyleFlag, setLifestyleField, resetLifestyle,
    runPrediction, isPredicting, result,
    history,
  } = usePrediction();

  const categoryCounts: Record<string, number> = {};
  const selectedCategoryCounts: Record<string, number> = {};
  if (symptomsData?.categories) {
    Object.entries(symptomsData.categories).forEach(([cat, syms]) => {
      categoryCounts[cat] = syms.length;
      selectedCategoryCounts[cat] = syms.filter((s) =>
        selectedSymptoms.includes(s)
      ).length;
    });
  }

  const canPredict = selectedSymptoms.length > 0 && !isPredicting;
  const historyItems = Array.isArray(history) ? (history as PredictionHistoryItem[]) : [];

  return (
    <ErrorBoundary>
        <div className="animate-page-in space-y-4">

        {/* ─── Page header ─── */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,245,200,0.1)", border: `1px solid ${theme.colors.accent.border}` }}
          >
            <i className="fas fa-stethoscope text-xs" style={{ color: theme.colors.accent.primary }} />
          </div>
          <div className="flex-1">
            <h1 className="font-black" style={{ fontSize: "1rem", color: theme.colors.text.primary, letterSpacing: "-0.02em" }}>
              Disease Prediction
            </h1>
            <p style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
              LightGBM · WHO-adjusted · 41 diseases · 131 symptoms · XAI explained
            </p>
          </div>
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ fontSize: "0.6rem", fontWeight: 700, color: theme.colors.health.recovery.DEFAULT, background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.15)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: theme.colors.health.recovery.DEFAULT, boxShadow: `0 0 4px ${theme.colors.health.recovery.DEFAULT}` }}
            />
            ML Active
          </span>
        </div>

        {/* ─── Symptom selector card ─── */}
        <div>
          {/* Step label */}
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: theme.colors.accent.primary,
                fontSize: "0.5rem",
                fontWeight: 900,
                color: theme.colors.bg.primary,
                flexShrink: 0,
              }}
            >1</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: theme.colors.text.muted, letterSpacing: "0.04em" }}>
              Select Symptoms
            </span>
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, marginLeft: "auto" }}>
              {selectedSymptoms.length}/20 selected
            </span>
          </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[2]}` }}
        >
          {/* Category tabs — horizontal scroll */}
          <CategoryPills
            categories={categories}
            active={activeCategory}
            onSelect={setCategory}
            counts={categoryCounts}
            selectedCounts={selectedCategoryCounts}
          />

          {/* Search bar */}
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <i
                className="fas fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeCategory === "All" ? "symptoms" : activeCategory}…`}
                className="w-full outline-none rounded-lg"
                style={{
                  paddingLeft: "28px",
                  paddingRight: searchQuery ? "28px" : "10px",
                  paddingTop: "6px",
                  paddingBottom: "6px",
                  background: theme.colors.surface[3],
                  border: `1.5px solid ${theme.colors.border[2]}`,
                  color: theme.colors.text.primary,
                  fontSize: "0.75rem",
                  fontFamily: theme.typography.fonts.primary,
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(0,245,200,0.4)"; }}
                onBlur={(e) => { e.target.style.borderColor = theme.colors.border[2]; }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                  style={{ color: theme.colors.text.subtle, background: "none", border: "none", cursor: "pointer" }}
                >
                  <i className="fas fa-xmark" style={{ fontSize: "0.6rem" }} />
                </button>
              )}
            </div>
          </div>

          {/* Symptom area — scrollable vertically, pills scroll horizontally per section */}
          <div className="overflow-y-auto px-3 pb-2" style={{ maxHeight: "280px", scrollbarWidth: "thin" }}>
            <SymptomGrid
              symptoms={filteredSymptoms}
              selected={selectedSymptoms}
              onToggle={toggleSymptom}
              isLoading={symptomsLoading}
              categories={symptomsData?.categories}
              activeCategory={activeCategory}
            />
          </div>

          {/* Clear all — only when selections exist */}
          {selectedSymptoms.length > 0 && (
            <div
              className="flex items-center justify-end px-3 py-1"
              style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}
            >
              <button
                onClick={clearAll}
                style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, fontFamily: theme.typography.fonts.primary, cursor: "pointer", opacity: 0.7, background: "none", border: "none" }}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Selected chips strip */}
          <AnimatePresence>
            {selectedSymptoms.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden", borderTop: `1px solid ${theme.colors.border[1]}` }}
              >
                <div className="px-3 py-2 flex flex-wrap gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {selectedSymptoms.map((sym) => (
                      <motion.span
                        key={sym}
                        layout
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="inline-flex items-center gap-1 rounded-lg font-semibold"
                        style={{
                          padding: "2px 8px",
                          fontSize: "0.65rem",
                          background: "rgba(0,245,200,0.1)",
                          color: theme.colors.accent.primary,
                          border: "1px solid rgba(0,245,200,0.22)",
                        }}
                      >
                        {fmt(sym)}
                        <button
                          onClick={() => removeSymptom(sym)}
                          className="opacity-60 hover:opacity-100"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          <i className="fas fa-xmark" style={{ fontSize: "0.45rem", color: theme.colors.accent.primary }} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div> {/* end step-1 wrapper */}

        {/* ─── Country + Lifestyle row ─── */}
        <div>
          {/* Step label */}
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "rgba(0,245,200,0.12)",
                border: `1px solid rgba(0,245,200,0.35)`,
                fontSize: "0.5rem",
                fontWeight: 900,
                color: theme.colors.accent.primary,
                flexShrink: 0,
              }}
            >2</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: theme.colors.text.muted, letterSpacing: "0.04em" }}>
              Optional Context
            </span>
            <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, fontStyle: "italic" }}>— improves accuracy</span>
          </div>
        <div className="grid grid-cols-2 gap-3">

          {/* Country */}
          <div
            className="rounded-xl p-3"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[2]}` }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <i className="fas fa-globe" style={{ fontSize: "0.65rem", color: theme.colors.accent.primary }} />
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: theme.colors.text.subtle, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                Country
              </span>
              <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, opacity: 0.6 }}>· optional</span>
            </div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full rounded-lg outline-none"
              style={{
                padding: "5px 8px",
                fontSize: "0.72rem",
                fontFamily: theme.typography.fonts.primary,
                background: theme.colors.surface[3],
                border: `1.5px solid ${selectedCountry ? theme.colors.accent.border : theme.colors.border[2]}`,
                color: selectedCountry ? theme.colors.text.primary : theme.colors.text.subtle,
                cursor: "pointer",
              }}
            >
              <option value="">Select country…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <p className="mt-1" style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
              <i className="fas fa-database mr-1" />WHO data · {countries.length} countries
            </p>
          </div>

          {/* Lifestyle */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[2]}` }}
          >
            <button
              onClick={() => setShowLifestyle(!showLifestyle)}
              className="w-full flex items-center justify-between px-3 py-3"
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: theme.typography.fonts.primary }}
            >
              <div className="flex items-center gap-1.5">
                <i className="fas fa-heart-pulse" style={{ fontSize: "0.65rem", color: theme.colors.accent.primary }} />
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: theme.colors.text.subtle, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                  Lifestyle
                </span>
                <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, opacity: 0.6 }}>· optional</span>
              </div>
              <i
                className={`fas fa-chevron-${showLifestyle ? "up" : "down"}`}
                style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}
              />
            </button>

            <AnimatePresence>
              {showLifestyle && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="px-3 pb-3 space-y-2"
                    style={{ borderTop: `1px solid ${theme.colors.border[1]}`, paddingTop: "10px" }}
                  >
                    {/* Boolean flags */}
                    <div className="flex flex-wrap gap-1">
                      {(["smoker", "drinker", "diabetic", "hypertensive"] as Array<keyof Pick<LifestyleState, "smoker" | "drinker" | "diabetic" | "hypertensive">>).map((flag) => (
                        <button
                          key={flag}
                          onClick={() => toggleLifestyleFlag(flag)}
                          style={{
                            padding: "2px 8px",
                            fontSize: "0.6rem",
                            borderRadius: "6px",
                            fontWeight: 700,
                            textTransform: "capitalize" as const,
                            cursor: "pointer",
                            fontFamily: theme.typography.fonts.primary,
                            background: lifestyle[flag] ? theme.colors.accent.primary : theme.colors.surface[4],
                            color: lifestyle[flag] ? theme.colors.bg.primary : theme.colors.text.subtle,
                            border: `1px solid ${lifestyle[flag] ? theme.colors.accent.primary : theme.colors.border[2]}`,
                          }}
                        >
                          {lifestyle[flag] ? "✓ " : ""}{flag}
                        </button>
                      ))}
                    </div>

                    {/* Dropdowns */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label
                          htmlFor="ls-age"
                          style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, fontWeight: 700, textTransform: "uppercase" as const }}
                        >
                          Age
                        </label>
                        <select
                          id="ls-age"
                          value={lifestyle.age_group}
                          onChange={(e) => setLifestyleField("age_group", e.target.value as LifestyleState["age_group"])}
                          className="w-full rounded-lg outline-none mt-0.5"
                          style={{ padding: "4px 6px", fontSize: "0.65rem", fontFamily: theme.typography.fonts.primary, background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, cursor: "pointer" }}
                        >
                          <option value="young">18–35</option>
                          <option value="middle">36–59</option>
                          <option value="senior">60+</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="ls-bmi"
                          style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, fontWeight: 700, textTransform: "uppercase" as const }}
                        >
                          BMI
                        </label>
                        <select
                          id="ls-bmi"
                          value={lifestyle.bmi_category}
                          onChange={(e) => setLifestyleField("bmi_category", e.target.value as LifestyleState["bmi_category"])}
                          className="w-full rounded-lg outline-none mt-0.5"
                          style={{ padding: "4px 6px", fontSize: "0.65rem", fontFamily: theme.typography.fonts.primary, background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, cursor: "pointer" }}
                        >
                          <option value="normal">Normal</option>
                          <option value="overweight">Overweight</option>
                          <option value="obese">Obese</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={resetLifestyle}
                      style={{ fontSize: "0.6rem", color: theme.colors.text.subtle, fontFamily: theme.typography.fonts.primary, cursor: "pointer", background: "none", border: "none" }}
                    >
                      &#8635; Reset
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div> {/* end step-2 wrapper */}

        {/* ─── Analyze button ─── */}
        <div>
          {/* Step label */}
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: canPredict ? theme.colors.accent.primary : "rgba(0,245,200,0.12)",
                border: canPredict ? "none" : `1px solid rgba(0,245,200,0.35)`,
                fontSize: "0.5rem",
                fontWeight: 900,
                color: canPredict ? theme.colors.bg.primary : theme.colors.accent.primary,
                flexShrink: 0,
                transition: "all 0.3s ease",
              }}
            >3</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: canPredict ? theme.colors.text.primary : theme.colors.text.muted, letterSpacing: "0.04em", transition: "color 0.3s" }}>
              {canPredict ? "Ready — Run Analysis" : "Run AI Analysis"}
            </span>
          </div>

          <motion.button
            id="run-prediction-btn"
            onClick={runPrediction}
            disabled={!canPredict}
            className="w-full py-3.5 rounded-2xl font-black flex items-center justify-center gap-2.5"
            style={{
              fontSize: "0.9rem",
              fontFamily: theme.typography.fonts.primary,
              letterSpacing: "-0.01em",
              background: canPredict
                ? `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`
                : theme.colors.surface[3],
              color: canPredict ? theme.colors.bg.primary : theme.colors.text.subtle,
              boxShadow: canPredict ? "0 0 28px rgba(0,245,200,0.22), 0 4px 16px rgba(0,0,0,0.3)" : "none",
              cursor: canPredict ? "pointer" : "not-allowed",
              opacity: selectedSymptoms.length === 0 ? 0.45 : 1,
              border: "none",
            }}
            whileHover={canPredict ? { y: -2, boxShadow: "0 0 40px rgba(0,245,200,0.32)" } : {}}
            whileTap={canPredict ? { scale: 0.98 } : {}}
          >
            {isPredicting ? (
              <><SpinnerLoader size="sm" /> Analyzing…</>
            ) : (
              <>
                <i className="fas fa-brain" />
                Run AI Analysis
                {selectedSymptoms.length > 0 && (
                  <span className="opacity-60" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    · {selectedSymptoms.length} symptom{selectedSymptoms.length > 1 ? "s" : ""}
                  </span>
                )}
              </>
            )}
          </motion.button>
        </div> {/* end step-3 wrapper */}

        {/* ─── Results ─── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              <ResultHero result={result} />
              {result.who_adjustment && <WHOCard who={result.who_adjustment} />}
              {result.lifestyle_adjustment && result.lifestyle_adjustment.risk_boosts.length > 0 && (
                <LifestyleCard ls={result.lifestyle_adjustment} />
              )}
              <XAIPanel
                xai={result.xai}
                predictedDisease={result.predicted_disease}
                confidence={result.confidence}
              />
              <ConsultSection />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── History ─── */}
        {historyItems.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                style={{ fontSize: "0.6rem", fontWeight: 700, color: theme.colors.text.subtle, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}
              >
                Recent Predictions
              </span>
              <div className="flex-1 h-px" style={{ background: theme.colors.border[1] }} />
            </div>
            <div className="space-y-1.5">
              {historyItems.slice(0, 4).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,245,200,0.07)" }}
                  >
                    <i className="fas fa-stethoscope" style={{ fontSize: "0.6rem", color: theme.colors.accent.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ fontSize: "0.78rem", color: theme.colors.text.primary }}>
                      {item.predicted_disease}
                    </div>
                    <div className="truncate" style={{ fontSize: "0.65rem", color: theme.colors.text.subtle }}>
                      {item.symptoms.split(",").slice(0, 3).map(fmt).join(", ")}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black" style={{ fontSize: "1rem", color: theme.colors.accent.primary, letterSpacing: "-0.04em" }}>
                      {item.confidence.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>
                      {new Date(item.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}

// ─── WHO card ───────────────────────────────────────────────────
function WHOCard({ who }: { who: WHOAdjustment }) {
  const riskColor =
    who.who_risk_level === "Low"      ? theme.colors.health.recovery.DEFAULT
    : who.who_risk_level === "Moderate" ? theme.colors.health.warning.DEFAULT
    : theme.colors.health.danger.DEFAULT;
  const dir = who.adjustment_factor > 1 ? "↑" : who.adjustment_factor < 1 ? "↓" : "→";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.accent.border}` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(0,245,200,0.08)" }}
      >
        <i className="fas fa-globe" style={{ color: theme.colors.accent.primary }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold" style={{ fontSize: "0.82rem", color: theme.colors.text.primary }}>
          {who.country_name}
        </div>
        <div style={{ fontSize: "0.65rem", color: theme.colors.text.subtle, lineHeight: 1.5 }}>
          {who.adjustment_reason}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-black" style={{ fontSize: "1.4rem", color: theme.colors.accent.primary, letterSpacing: "-0.04em" }}>
          {dir} {who.adjusted_confidence.toFixed(1)}%
        </div>
        <span
          style={{ fontSize: "0.6rem", padding: "2px 8px", borderRadius: "999px", background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}25` }}
        >
          {who.who_risk_level} Risk
        </span>
      </div>
    </motion.div>
  );
}

// ─── Lifestyle card ─────────────────────────────────────────────
function LifestyleCard({ ls }: { ls: LifestyleAdjustment }) {
  const riskColor =
    ls.new_risk_level === "High"     ? theme.colors.health.danger.DEFAULT
    : ls.new_risk_level === "Moderate" ? theme.colors.health.warning.DEFAULT
    : theme.colors.health.recovery.DEFAULT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${riskColor}30` }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor }} />
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: theme.colors.text.subtle, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
            Lifestyle Risk
          </span>
        </div>
        <span
          style={{ fontSize: "0.6rem", padding: "2px 8px", borderRadius: "999px", background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}25` }}
        >
          {ls.new_risk_level}
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        {ls.risk_boosts.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg"
            style={{ background: `${riskColor}08`, border: `1px solid ${riskColor}15` }}
          >
            <i className="fas fa-triangle-exclamation mt-0.5 flex-shrink-0" style={{ fontSize: "0.6rem", color: riskColor }} />
            <p style={{ fontSize: "0.72rem", color: theme.colors.text.muted, lineHeight: 1.5 }}>{b}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
