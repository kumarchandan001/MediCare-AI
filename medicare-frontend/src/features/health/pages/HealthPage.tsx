import { AnimatePresence, motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useHealth } from "../hooks/useHealth";
import { TabSwitcher } from "../components/TabSwitcher";
import { VitalsForm } from "../components/VitalsForm";
import { ActivityForm } from "../components/ActivityForm";
import { BMICalculator } from "../components/BMICalculator";
import { MedicationManager } from "../components/MedicationManager";
import { HealthHistoryTable } from "../components/HealthHistoryTable";
import { HealthStatCards } from "../components/HealthStatCards";
import { useGoogleFitStatus, useGoogleFitSync } from "@/features/googleFit/hooks/useGoogleFit";

export default function HealthPage() {
  const {
    activeTab,
    setActiveTab,
    history,
    historyLoading,
    medications,
    medsLoading,
    summary,
    summaryLoading,
    bmiResult,
    saveVitals,
    saveActivity,
    calculateBMI,
    addMedication,
    toggleMedication,
    deleteMedication,
    isSavingVitals,
    isSavingActivity,
    isCalculatingBMI,
    isAddingMed,
  } = useHealth();

  const { data: fitStatus } = useGoogleFitStatus();
  const { sync, isSyncing } = useGoogleFitSync();

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        {/* ── Google Fit Sync Banner ────── */}
        {fitStatus?.connected && (
          <div
            className="flex items-center justify-between p-3 rounded-xl mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(66,133,244,0.08), rgba(52,168,83,0.08))",
              border: "1px solid rgba(66,133,244,0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <i className="fab fa-google text-sm" style={{ color: "#4285F4" }} />
              <div>
                <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.primary, fontWeight: 600 }}>
                  Google Fit Connected
                </div>
                <div style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>
                  {fitStatus.last_sync
                    ? `Last synced: ${new Date(fitStatus.last_sync).toLocaleString("en-IN")}`
                    : "Not synced yet"}
                </div>
              </div>
            </div>
            <button
              onClick={() => sync(1)}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              style={{
                fontSize: "0.6rem",
                fontFamily: theme.typography.fonts.primary,
                background: "rgba(66,133,244,0.15)",
                color: "#4285F4",
                minHeight: "32px",
              }}
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        )}

        {/* ── Page Header ──────────────── */}
        <div
          className="flex items-center gap-4 p-5 rounded-2xl mb-6"
          style={{
            background: theme.colors.surface[2],
            border: `1px solid ${theme.colors.accent.border}`,
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: theme.colors.health.danger.bg,
              border: `1px solid ${theme.colors.health.danger.border}`,
            }}
          >
            <i className="fas fa-heart-pulse text-lg" style={{ color: theme.colors.health.danger.DEFAULT }} />
          </div>
          <div className="flex-1">
            <h1
              className="font-black tracking-tight"
              style={{
                fontSize: theme.typography.sizes.h2,
                color: theme.colors.text.primary,
                letterSpacing: "-0.02em",
              }}
            >
              Health Tracking
            </h1>
            <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
              Log vitals · Track activity · Monitor medications
            </p>
          </div>

          {/* Record count */}
          <div className="text-right hidden sm:block">
            <div
              className="font-black"
              style={{
                fontSize: theme.typography.sizes.h2,
                color: theme.colors.accent.primary,
                letterSpacing: "-0.04em",
              }}
            >
              {(history as unknown[] | undefined)?.length || 0}
            </div>
            <div
              className="font-bold uppercase tracking-widest"
              style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
            >
              Records
            </div>
          </div>
        </div>

        {/* ── Summary Stats ─────────────── */}
        <HealthStatCards summary={summary as Record<string, number> | undefined} isLoading={summaryLoading} />

        {/* ── Tab Switcher ──────────────── */}
        <TabSwitcher active={activeTab} onChange={setActiveTab} />

        {/* ── Tab Content ──────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "vitals" && <VitalsForm onSubmit={saveVitals} isSaving={isSavingVitals} />}

            {activeTab === "activity" && <ActivityForm onSubmit={saveActivity} isSaving={isSavingActivity} />}

            {activeTab === "bmi" && (
              <BMICalculator onSubmit={calculateBMI} isSaving={isCalculatingBMI} result={bmiResult} />
            )}

            {activeTab === "medications" && (
              <MedicationManager
                data={medications as any}
                isLoading={medsLoading}
                onAdd={addMedication as any}
                onToggle={toggleMedication}
                onDelete={deleteMedication}
                isAdding={isAddingMed}
              />
            )}

            {activeTab === "history" && (
              <HealthHistoryTable data={history as any} isLoading={historyLoading} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
