import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import {
  useHealthSummary,
  useRiskScore,
  useInsights,
  useAlerts,
  useHabitTips,
} from "../hooks/useDashboard";
import { GreetingBanner } from "../components/GreetingBanner";
import { HeroScores } from "../components/HeroScores";
import { MetricCard } from "../components/MetricCard";
import { InsightsList } from "../components/InsightsList";
import { RiskScoreCard } from "../components/RiskScoreCard";
import { AlertsList } from "../components/AlertsList";
import { TrendChart } from "../components/TrendChart";
import { HabitCards } from "../components/HabitCards";
import { QuickActions } from "../components/QuickActions";
import { MetricCardSkeleton } from "@/shared/components/skeleton/MetricCardSkeleton";

// ── Section Label ────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="font-bold uppercase tracking-widest"
        style={{
          fontSize: theme.typography.sizes.xxs,
          color: theme.colors.text.subtle,
        }}
      >
        {children}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: theme.colors.border[1] }}
      />
    </div>
  );
}

// ── Card Wrapper ─────────────────────────
function DashCard({
  children,
  title,
  badge,
}: {
  children: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
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
            {title}
          </span>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ══════════════════════════════════════════

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useHealthSummary();
  const { data: riskScore, isLoading: riskLoading } = useRiskScore();
  const { data: insights, isLoading: insightsLoading } = useInsights();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: habits, isLoading: habitsLoading } = useHabitTips();

  const topInsight = insights?.insights[0]?.message;

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        {/* ── Greeting Banner ────────────── */}
        <GreetingBanner insight={topInsight} />

        {/* ── Hero Scores (3 rings) ───────── */}
        <HeroScores
          summary={summary}
          riskScore={riskScore}
          isLoading={summaryLoading}
        />

        {/* ── Vital Metrics (4 cards) ─────── */}
        <SectionLabel>Vital Metrics</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryLoading ? (
            [1, 2, 3, 4].map((i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Sleep"
                value={summary?.sleep ?? 0}
                unit="hrs"
                icon="fa-moon"
                color={theme.colors.health.sleep.DEFAULT}
                trend={summary?.sleep_trend}
                progress={summary?.sleep_progress ?? 0}
                index={0}
              />
              <MetricCard
                label="Steps"
                value={summary?.steps ?? 0}
                icon="fa-person-walking"
                color={theme.colors.health.strain.DEFAULT}
                trend={summary?.steps_trend}
                progress={summary?.steps_progress ?? 0}
                index={1}
              />
              <MetricCard
                label="Hydration"
                value={summary?.water ?? 0}
                unit="L"
                icon="fa-droplet"
                color={theme.colors.accent.primary}
                trend={summary?.water_trend}
                progress={summary?.water_progress ?? 0}
                index={2}
              />
              <MetricCard
                label="BMI"
                value={summary?.bmi ?? 0}
                icon="fa-weight-scale"
                color={theme.colors.health.recovery.DEFAULT}
                index={3}
                progress={summary?.bmi_progress ?? 0}
              />
            </>
          )}
        </div>

        {/* ── Insights + Risk + Alerts ────── */}
        <div
          className="grid gap-5 mb-6"
          style={{ gridTemplateColumns: "1fr", }}
        >
          {/* Desktop: 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
            {/* Left column */}
            <div className="space-y-5">
              {/* AI Insights */}
              <DashCard
                title="AI Health Insights"
                badge={
                  <span
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    style={{
                      background: theme.colors.health.recovery.bg,
                      color: theme.colors.health.recovery.DEFAULT,
                      border: `1px solid ${theme.colors.health.recovery.border}`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{
                        background: theme.colors.health.recovery.DEFAULT,
                      }}
                    />
                    Live
                  </span>
                }
              >
                <InsightsList data={insights} isLoading={insightsLoading} />
              </DashCard>

              {/* Trend Chart */}
              <DashCard title="7-Day Trends">
                <TrendChart data={summary} isLoading={summaryLoading} />
              </DashCard>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Risk Score */}
              <DashCard title="Risk Score">
                <RiskScoreCard data={riskScore} isLoading={riskLoading} />
              </DashCard>

              {/* Active Alerts */}
              <DashCard
                title="Active Alerts"
                badge={
                  alerts?.critical_count ? (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: theme.colors.health.danger.bg,
                        color: theme.colors.health.danger.DEFAULT,
                      }}
                    >
                      {alerts.critical_count}
                    </span>
                  ) : null
                }
              >
                <AlertsList data={alerts} isLoading={alertsLoading} />
              </DashCard>
            </div>
          </div>
        </div>

        {/* ── Habit Coach ─────────────────── */}
        <SectionLabel>Habit Coach</SectionLabel>
        <div className="mb-6">
          <HabitCards data={habits} isLoading={habitsLoading} />
        </div>

        {/* ── Quick Actions ────────────────── */}
        <SectionLabel>Quick Actions</SectionLabel>
        <QuickActions />
      </div>
    </ErrorBoundary>
  );
}
