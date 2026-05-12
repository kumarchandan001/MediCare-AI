/**
 * ManualSymptomRefinementPanel — Slide-out panel for advanced manual symptom selection.
 * Preserves CategoryPills and SymptomGrid as secondary investigation tools.
 * NOT the primary interaction — the clinical interview is.
 */
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigation } from "../InvestigationStateProvider";
import { usePrediction } from "@/features/prediction/hooks/usePrediction";
import { CategoryPills } from "@/features/prediction/components/CategoryPills";
import { SymptomGrid } from "@/features/prediction/components/SymptomGrid";

export default function ManualSymptomRefinementPanel() {
  const inv = useInvestigation();
  const prediction = usePrediction();

  const {
    symptomsData, symptomsLoading, filteredSymptoms,
    categories, searchQuery, setSearchQuery,
    activeCategory, setCategory,
  } = prediction;

  const categoryCounts: Record<string, number> = {};
  const selectedCategoryCounts: Record<string, number> = {};
  if (symptomsData?.categories) {
    Object.entries(symptomsData.categories).forEach(([cat, syms]) => {
      categoryCounts[cat] = syms.length;
      selectedCategoryCounts[cat] = syms.filter(s => inv.manuallyAddedSymptoms.includes(s)).length;
    });
  }

  const handleToggle = (symptom: string) => {
    if (inv.manuallyAddedSymptoms.includes(symptom)) {
      inv.removeManualSymptom(symptom);
    } else {
      inv.addManualSymptom(symptom);
    }
  };

  return (
    <AnimatePresence>
      {inv.manualSymptomsPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => inv.setManualSymptomsPanelOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="ucw-manual-panel"
          >
            {/* Header */}
            <div className="ucw-manual-panel-header">
              <div>
                <div style={{
                  fontSize: "0.85rem", fontWeight: 900,
                  color: "rgba(255,255,255,0.95)",
                  letterSpacing: "-0.02em",
                }}>
                  Manual Symptom Refinement
                </div>
                <div style={{
                  fontSize: "0.58rem", color: "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}>
                  Browse and add symptoms to refine your investigation
                </div>
              </div>
              <button
                onClick={() => inv.setManualSymptomsPanelOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: theme.colors.surface[4],
                  border: `1px solid ${theme.colors.border[2]}`,
                  color: theme.colors.text.subtle,
                  cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <i className="fas fa-xmark" style={{ fontSize: "0.7rem" }} />
              </button>
            </div>

            {/* Selected count */}
            {inv.manuallyAddedSymptoms.length > 0 && (
              <div style={{
                padding: "8px 16px",
                background: "rgba(0,245,200,0.04)",
                borderBottom: "1px solid rgba(0,245,200,0.08)",
                fontSize: "0.62rem", color: theme.colors.accent.primary,
                fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <i className="fas fa-check-circle" style={{ fontSize: "0.55rem" }} />
                {inv.manuallyAddedSymptoms.length} symptom{inv.manuallyAddedSymptoms.length > 1 ? "s" : ""} selected
              </div>
            )}

            {/* Category pills */}
            <CategoryPills
              categories={categories}
              active={activeCategory}
              onSelect={setCategory}
              counts={categoryCounts}
              selectedCounts={selectedCategoryCounts}
            />

            {/* Search */}
            <div style={{ padding: "0 16px 8px" }}>
              <div style={{ position: "relative" }}>
                <i className="fas fa-magnifying-glass" style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.65rem", color: theme.colors.text.subtle,
                }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeCategory === "All" ? "symptoms" : activeCategory}…`}
                  style={{
                    width: "100%", paddingLeft: 28, paddingRight: 10,
                    paddingTop: 7, paddingBottom: 7, borderRadius: 10,
                    background: theme.colors.surface[3],
                    outline: "none",
                    border: `1.5px solid ${theme.colors.border[2]}`,
                    color: theme.colors.text.primary,
                    fontSize: "0.75rem",
                    fontFamily: theme.typography.fonts.primary,
                  }}
                />
              </div>
            </div>

            {/* Symptom grid */}
            <div style={{
              flex: 1, overflow: "auto", padding: "0 16px 16px",
              scrollbarWidth: "thin" as const,
            }}>
              <SymptomGrid
                symptoms={filteredSymptoms}
                selected={inv.manuallyAddedSymptoms}
                onToggle={handleToggle}
                isLoading={symptomsLoading}
                categories={symptomsData?.categories}
                activeCategory={activeCategory}
              />
            </div>

            {/* Selected chips */}
            {inv.manuallyAddedSymptoms.length > 0 && (
              <div style={{
                padding: "10px 16px",
                borderTop: `1px solid ${theme.colors.border[1]}`,
                display: "flex", flexWrap: "wrap", gap: 5,
                maxHeight: 80, overflowY: "auto",
              }}>
                {inv.manuallyAddedSymptoms.map(sym => (
                  <span key={sym} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 8,
                    fontSize: "0.6rem", fontWeight: 600,
                    background: "rgba(0,245,200,0.1)",
                    color: theme.colors.accent.primary,
                    border: "1px solid rgba(0,245,200,0.22)",
                  }}>
                    {sym.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    <button
                      onClick={() => inv.removeManualSymptom(sym)}
                      style={{
                        background: "none", border: "none",
                        cursor: "pointer", padding: 0, opacity: 0.6,
                      }}
                    >
                      <i className="fas fa-xmark" style={{
                        fontSize: "0.4rem",
                        color: theme.colors.accent.primary,
                      }} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Done button */}
            <div style={{ padding: "12px 16px" }}>
              <button
                onClick={() => inv.setManualSymptomsPanelOpen(false)}
                style={{
                  width: "100%", padding: "12px 0",
                  borderRadius: 14, border: "none",
                  fontWeight: 800, fontSize: "0.82rem",
                  fontFamily: theme.typography.fonts.primary,
                  cursor: "pointer",
                  background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                  color: theme.colors.bg.primary,
                  boxShadow: "0 0 20px rgba(0,245,200,0.15)",
                }}
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
