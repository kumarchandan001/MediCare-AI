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
import { RealtimeAlertStrip } from "../components/RealtimeAlertStrip";
import { OrchestrationOverview } from "../components/OrchestrationOverview";
import { SectionHeader, ConnectionStatus } from "@/components";

// ── STEP 2: Realtime Intelligence Imports ─────
import { LiveVitalsPanel } from "@/features/realtime";
import { StressStateVisualizer } from "@/features/realtime";
import { LiveRecoveryMonitor } from "@/features/realtime";
import { LiveSessionBanner } from "@/features/realtime";
import { ConnectionRecoveryOverlay } from "@/features/wearables";
import { SignalReliabilityBadge } from "@/features/wearables";
import { LiveCoachingPanel } from "@/features/coaching";
import { StreamingInsightCards } from "@/features/coaching";
import { BurnoutRiskIndicators } from "@/features/alerts";
import { LiveHeartRateChart } from "@/components/charts";
import { PhysiologicalDriftGraph } from "@/components/charts";
import { SleepStateChart } from "@/components/charts";
import { useIsMobile } from "@/hooks/useMediaQuery";

// ── STEP 3: Digital Twin, Simulation & Wellness Intelligence ───
import { Suspense, lazy } from "react";
import { PhysiologicalIdentityCard } from "@/features/digitalTwin";
import { TwinStateVisualizer } from "@/features/digitalTwin";
import { ResilienceEvolutionPanel } from "@/features/digitalTwin";
import { BehavioralAdaptationMap } from "@/features/digitalTwin";
import { TwinMemoryTimeline } from "@/features/digitalTwin";
import { WeeklyReflectionCard } from "@/features/reflection";
import { RecoveryReflectionSummary } from "@/features/reflection";
import { ResilienceGrowthHighlights } from "@/features/reflection";
import { AdaptiveLifestyleInsights } from "@/features/reflection";
import { WellnessCapacityMeter } from "@/features/energy";
import { CognitiveLoadIndicator } from "@/features/energy";
import { RecoveryBandwidthPanel } from "@/features/energy";
import { FutureScenarioExplorer } from "@/features/simulation";
import { RecoveryTrajectoryViewer } from "@/features/simulation";
import { StressProjectionGraph } from "@/features/simulation";
import { SleepDebtSimulation } from "@/features/simulation";
import { WellnessOrchestrationPanel } from "@/features/orchestration";
import { AgentDecisionFlow } from "@/features/orchestration";
import { WellnessTradeoffVisualizer } from "@/features/orchestration";
import { ReasoningChainViewer } from "@/features/explainability";
import { ConfidenceVisualization } from "@/features/explainability";
import { WellnessJourneyTimeline } from "@/features/storytelling";
import { WellnessAchievementMilestones } from "@/features/storytelling";

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
        className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4"
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
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

// ── Live Badge ───────────────────────────
function LiveBadge() {
  return (
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
        style={{ background: theme.colors.health.recovery.DEFAULT }}
      />
      Live
    </span>
  );
}

// ── Mock data for realtime components (will be replaced by WS data) ───
const mockHRData = Array.from({ length: 30 }, (_, i) => ({
  time: `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
  bpm: 65 + Math.floor(Math.random() * 25),
}));

const mockDriftData = Array.from({ length: 20 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  stress: 25 + Math.floor(Math.random() * 30),
  recovery: 50 + Math.floor(Math.random() * 30),
}));

const mockSleepSegments = [
  { stage: "light" as const, startMin: 0, durationMin: 40 },
  { stage: "deep" as const, startMin: 40, durationMin: 90 },
  { stage: "light" as const, startMin: 130, durationMin: 30 },
  { stage: "rem" as const, startMin: 160, durationMin: 60 },
  { stage: "light" as const, startMin: 220, durationMin: 45 },
  { stage: "deep" as const, startMin: 265, durationMin: 70 },
  { stage: "rem" as const, startMin: 335, durationMin: 50 },
  { stage: "awake" as const, startMin: 385, durationMin: 15 },
  { stage: "light" as const, startMin: 400, durationMin: 40 },
];

const mockCoachingNudges = [
  {
    id: "c1",
    type: "hydration" as const,
    title: "Stay Hydrated",
    message: "You've only logged 1.2L today — try a glass of water before your next meeting.",
    reasoning: "Your cognitive load is moderate, and hydration improves focus by ~14%.",
    confidence: 0.82,
    contextSource: "Based on your activity + hydration trend",
    priority: "suggested" as const,
  },
  {
    id: "c2",
    type: "movement" as const,
    title: "Movement Break",
    message: "You've been sedentary for 90 minutes — a short walk could help reset your stress baseline.",
    confidence: 0.76,
    contextSource: "Based on your sedentary time",
    priority: "gentle" as const,
  },
];

const mockStreamingInsights = [
  {
    id: "si1",
    title: "Improving Sleep Pattern",
    summary: "Your deep sleep has increased by 12% this week, suggesting better recovery quality.",
    confidence: 0.88,
    category: "improvement" as const,
    reasoning: ["Deep sleep up 12% vs. last week", "Aligned with reduced caffeine after 3pm"],
    dataSource: "Sleep sensor",
    isLive: true,
  },
  {
    id: "si2",
    title: "Stress Pattern Detected",
    summary: "Elevated stress consistently appears between 2–4pm on workdays.",
    confidence: 0.72,
    category: "pattern" as const,
    dataSource: "HRV analysis",
    isLive: false,
  },
];

// ── STEP 3: Mock data for Digital Twin, Simulation & Intelligence ──
const mockTwinTraits = [
  { name: "Stress Recovery", strength: 0.78, icon: "fa-shield-heart", color: "#00E676" },
  { name: "Sleep Quality", strength: 0.65, icon: "fa-moon", color: "#9C6FFF" },
  { name: "Cognitive Stamina", strength: 0.7, icon: "fa-brain", color: "#8B6BFF" },
  { name: "Emotional Balance", strength: 0.82, icon: "fa-heart", color: "#FF6B8A" },
];

const mockTwinDimensions = [
  { label: "Resilience", value: 72, color: "#00E676" },
  { label: "Recovery", value: 68, color: "#9C6FFF" },
  { label: "Stress", value: 35, color: "#FFB300" },
  { label: "Cognitive", value: 70, color: "#8B6BFF" },
  { label: "Emotional", value: 82, color: "#FF6B8A" },
  { label: "Physical", value: 65, color: "#00B4FF" },
];

const mockResilienceData = [
  { period: "W1", resilience: 55, baseline: 50 },
  { period: "W2", resilience: 58, baseline: 52 },
  { period: "W3", resilience: 62, baseline: 55 },
  { period: "W4", resilience: 60, baseline: 56 },
  { period: "W5", resilience: 66, baseline: 58 },
  { period: "W6", resilience: 70, baseline: 60 },
  { period: "W7", resilience: 72, baseline: 62 },
];

const mockAdaptations = [
  { id: "a1", stressor: "High workload", adaptation: "Micro-breaks", outcome: "Stress recovery improved 15% on heavy days", status: "established" as const, timeframe: "Over 3 weeks" },
  { id: "a2", stressor: "Late screens", adaptation: "Blue-light filter", outcome: "Deep sleep improved by 20 minutes", status: "integrated" as const, timeframe: "Since April" },
];

const mockMemories = [
  { id: "m1", category: "milestone" as const, title: "Recovery Baseline Improved", description: "Your resting heart rate dropped 4 bpm over two months.", date: "May 2026", significance: "major" as const },
  { id: "m2", category: "seasonal" as const, title: "Spring Energy Shift", description: "Activity levels naturally increased with warmer weather.", date: "April 2026", significance: "notable" as const },
  { id: "m3", category: "adaptation" as const, title: "Caffeine Timing Adjusted", description: "Stopped caffeine after 3pm — sleep onset improved.", date: "March 2026", significance: "notable" as const },
  { id: "m4", category: "recovery" as const, title: "Post-Travel Recovery", description: "Fully recovered from jet lag in 3 days instead of the usual 5.", date: "Feb 2026", significance: "minor" as const },
];

const mockWeekHighlights = [
  { icon: "fa-heart-pulse", label: "Avg HR", value: "68", color: "#FF6B8A", change: "-2 bpm" },
  { icon: "fa-moon", label: "Sleep", value: "7.4h", color: "#9C6FFF", change: "+0.3h" },
  { icon: "fa-person-walking", label: "Steps", value: "8.2k", color: "#00B4FF" },
  { icon: "fa-shield-heart", label: "Resilience", value: "72", color: "#00E676", change: "+3" },
];

const mockRecoveryPeriods = [
  { label: "Tuesday evening rest", recoveryGain: 18, strategy: "Early sleep + no screens" },
  { label: "Saturday morning", recoveryGain: 24, strategy: "Extended sleep + gentle walk" },
];

const mockResilienceHighlights = [
  { id: "rh1", title: "Resting HR Stabilized", description: "Your baseline heart rate has become more consistent, suggesting improved cardiovascular resilience.", timeframe: "Over the past 6 weeks", growthPercent: 12, icon: "fa-heart-pulse", color: "#FF6B8A" },
  { id: "rh2", title: "Stress Recovery Speed", description: "You're bouncing back from stressful episodes 20% faster than last month.", timeframe: "Over the past 4 weeks", growthPercent: 20, icon: "fa-bolt", color: "#00E676" },
];

const mockLifestyleInsights = [
  { id: "li1", habitName: "Consistent Sleep Schedule", status: "stabilized" as const, consistency: 78, description: "Your bedtime has been within a 30-minute window most nights.", since: "Consistent since April 22" },
  { id: "li2", habitName: "Morning Movement", status: "forming" as const, consistency: 55, description: "You're building a morning activity habit — keep it going." },
];

const mockRecoveryTrajectory = [
  { time: "Now", optimistic: 68, expected: 68, conservative: 68 },
  { time: "+6h", optimistic: 75, expected: 72, conservative: 66 },
  { time: "+12h", optimistic: 82, expected: 76, conservative: 68 },
  { time: "+24h", optimistic: 88, expected: 80, conservative: 70 },
  { time: "+48h", optimistic: 92, expected: 84, conservative: 72 },
];

const mockStressProjection = [
  { time: "Now", projected: 35, mitigated: 35, uncertaintyHigh: 40, uncertaintyLow: 30 },
  { time: "+6h", projected: 42, mitigated: 35, uncertaintyHigh: 50, uncertaintyLow: 35 },
  { time: "+12h", projected: 50, mitigated: 38, uncertaintyHigh: 60, uncertaintyLow: 40 },
  { time: "+24h", projected: 55, mitigated: 40, uncertaintyHigh: 65, uncertaintyLow: 42 },
];

const mockScenarios = [
  { id: "s1", label: "8hr Sleep Tonight", icon: "fa-moon", description: "Prioritize a full night's rest", impact: "positive" as const },
  { id: "s2", label: "Skip Exercise", icon: "fa-couch", description: "Rest day instead of workout", impact: "mixed" as const },
  { id: "s3", label: "Deep Work Block", icon: "fa-brain", description: "3-hour focused work session", impact: "mixed" as const },
];

const mockScenarioOutcomes: Record<string, Array<{ metric: string; current: number; projected: number; confidence: number; direction: "up" | "down" | "stable"; unit?: string }>> = {
  s1: [
    { metric: "Recovery Score", current: 68, projected: 82, confidence: 0.85, direction: "up" },
    { metric: "Cognitive Load", current: 35, projected: 25, confidence: 0.72, direction: "down", unit: "%" },
  ],
  s2: [
    { metric: "Recovery Score", current: 68, projected: 72, confidence: 0.68, direction: "up" },
    { metric: "Step Count", current: 8200, projected: 3000, confidence: 0.9, direction: "down" },
  ],
  s3: [
    { metric: "Cognitive Load", current: 35, projected: 65, confidence: 0.78, direction: "up", unit: "%" },
    { metric: "Stress Level", current: 35, projected: 50, confidence: 0.65, direction: "up" },
  ],
};

const mockOrchestrationPriorities = [
  { id: "op1", label: "Sleep Recovery", icon: "fa-moon", weight: 0.85, color: "#9C6FFF", reasoning: "Sleep debt detected — prioritizing rest and reducing activity targets.", active: true },
  { id: "op2", label: "Stress Management", icon: "fa-heart-pulse", weight: 0.65, color: "#FFB300", reasoning: "Afternoon stress patterns suggest mid-day interventions.", active: true },
  { id: "op3", label: "Activity Goals", icon: "fa-person-walking", weight: 0.4, color: "#00B4FF", reasoning: "Reduced priority to preserve recovery bandwidth.", active: true },
];

const mockAgents = [
  { id: "ag1", name: "Recovery Agent", icon: "fa-shield-heart", color: "#00E676", currentGoal: "Protecting recovery window for the next 6 hours", confidence: 0.88, status: "active" as const },
  { id: "ag2", name: "Activity Agent", icon: "fa-person-walking", color: "#00B4FF", currentGoal: "Adjusting step target to balance recovery", confidence: 0.72, status: "yielding" as const, yieldingTo: "Recovery Agent" },
  { id: "ag3", name: "Sleep Agent", icon: "fa-moon", color: "#9C6FFF", currentGoal: "Monitoring circadian alignment", confidence: 0.81, status: "observing" as const },
];

const mockTradeoffs = [
  { id: "t1", sacrificed: { label: "Step Count Target", icon: "fa-person-walking", color: "#00B4FF" }, preserved: { label: "Recovery Bandwidth", icon: "fa-shield-heart", color: "#00E676" }, reasoning: "Your recovery bandwidth is low — reducing movement targets preserves healing capacity.", impact: "minimal" as const },
];

const mockReasoningSteps = [
  { id: "rs1", label: "Heart rate elevated post-lunch", detail: "HRV dropped 15% from morning baseline between 1–3pm.", confidence: 0.92, type: "observation" as const },
  { id: "rs2", label: "Pattern matches sedentary stress", detail: "Similar patterns in 4 of last 5 workdays.", confidence: 0.78, type: "inference" as const },
  { id: "rs3", label: "Recommend movement break", detail: "A 10-minute walk has historically reduced your afternoon stress by 22%.", confidence: 0.81, type: "decision" as const },
];

const mockJourneyEvents = [
  { id: "je1", type: "milestone" as const, title: "First Month Complete", narrative: "You've been tracking for a full month. Your body's rhythms are becoming clearer, and your digital twin is learning your patterns.", date: "May 9, 2026", significance: "landmark" as const, emoji: "🎉" },
  { id: "je2", type: "recovery" as const, title: "Recovery Breakthrough", narrative: "After adjusting your evening routine, your deep sleep improved by 20 minutes — a meaningful change your body noticed.", date: "May 5, 2026", significance: "major" as const },
  { id: "je3", type: "growth" as const, title: "Stress Resilience Growing", narrative: "Your stress recovery speed has been steadily improving. You're bouncing back faster each week.", date: "April 28, 2026", significance: "notable" as const },
  { id: "je4", type: "stabilization" as const, title: "Sleep Schedule Stabilized", narrative: "Your bedtime consistency reached 78% — a strong foundation for long-term wellness.", date: "April 20, 2026", significance: "notable" as const },
];

const mockAchievements = [
  { id: "ach1", title: "Recovery Champion", description: "Maintained healthy recovery scores for 3 consecutive weeks.", category: "recovery" as const, earnedDate: "May 8, 2026", icon: "fa-shield-heart", isNew: true },
  { id: "ach2", title: "Consistent Sleeper", description: "Kept a regular sleep schedule for 2 weeks running.", category: "balance" as const, earnedDate: "May 3, 2026", icon: "fa-moon" },
  { id: "ach3", title: "Stress Navigator", description: "Successfully managed 5 high-stress days with healthy coping.", category: "resilience" as const, earnedDate: "April 28, 2026", icon: "fa-compass" },
];

const mockSleepDebtImpacts = [
  { area: "Focus", icon: "fa-bullseye", currentImpact: 25, color: "#8B6BFF", description: "May slightly reduce sustained attention" },
  { area: "Mood", icon: "fa-face-smile", currentImpact: 15, color: "#FF6B8A", description: "Minimal impact on emotional regulation" },
  { area: "Recovery", icon: "fa-heart-pulse", currentImpact: 30, color: "#00E676", description: "May slow physiological recovery rate" },
];


// ══════════════════════════════════════════
// HEALTH INTELLIGENCE COMMAND CENTER
// ══════════════════════════════════════════

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useHealthSummary();
  const { data: riskScore, isLoading: riskLoading } = useRiskScore();
  const { data: insights, isLoading: insightsLoading } = useInsights();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: habits, isLoading: habitsLoading } = useHabitTips();
  const isMobile = useIsMobile();

  const topInsight = insights?.insights[0]?.message;

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        {/* ── Connection Recovery Banner ─── */}
        <ConnectionRecoveryOverlay />

        {/* ── Live Session Banner ────────── */}
        <LiveSessionBanner active={false} />

        {/* ── Realtime Alert Strip (WS) ──── */}
        <RealtimeAlertStrip />

        {/* ── Greeting Banner ────────────── */}
        <GreetingBanner insight={topInsight} />

        {/* ── Hero Scores (3 rings) ───────── */}
        <HeroScores
          summary={summary}
          riskScore={riskScore}
          isLoading={summaryLoading}
        />

        {/* ═══════════════════════════════════ */}
        {/* ── LIVE PHYSIOLOGICAL INTELLIGENCE  */}
        {/* ═══════════════════════════════════ */}
        <SectionHeader icon="fa-wave-square">
          Live Physiological Intelligence
        </SectionHeader>

        {/* Live Vitals */}
        <div className="mb-4">
          <LiveVitalsPanel
            heartRate={{ value: summary?.heart_rate ?? 72, unit: "bpm", trend: "stable", normal_range: [60, 100] }}
            spO2={{ value: summary?.oxygen ?? 97, unit: "%", trend: "stable", normal_range: [95, 100] }}
            respiratoryRate={{ value: 16, unit: "brpm", trend: "stable", normal_range: [12, 20] }}
            bodyTemp={{ value: 98.4, unit: "°F", trend: "stable", normal_range: [97, 99] }}
            lastUpdated={new Date().toISOString()}
            isLive={false}
            compact={isMobile}
          />
        </div>

        {/* Stress + Recovery side-by-side */}
        <div className={`grid gap-4 sm:gap-5 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <DashCard title="Stress State" badge={<SignalReliabilityBadge quality="good" compact showLabel={false} />}>
            <StressStateVisualizer
              stressLevel={summary?.stress ?? 35}
              recoveryBandwidth={0.72}
              cognitiveLoad={0.35}
              compact={isMobile}
            />
          </DashCard>

          <DashCard title="Recovery Monitor">
            <LiveRecoveryMonitor
              recoveryScore={68}
              recoveryBandwidth={0.72}
              fatigueLevel={32}
              resilienceScore={65}
              recoveryPhase="resting"
              suggestion="Your recovery is progressing well. Light stretching could boost recovery bandwidth."
              compact={isMobile}
            />
          </DashCard>
        </div>

        {/* ── Vital Metrics (4 cards) ─────── */}
        <SectionHeader icon="fa-heart-pulse">Vital Metrics</SectionHeader>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

        {/* ═══════════════════════════════════ */}
        {/* ── REALTIME CHARTS ─────────────── */}
        {/* ═══════════════════════════════════ */}
        <SectionHeader icon="fa-chart-mixed">Live Charts</SectionHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
          <DashCard title="Heart Rate Stream" badge={<LiveBadge />}>
            <LiveHeartRateChart data={mockHRData} height={isMobile ? 160 : 200} />
          </DashCard>
          <DashCard title="Stress vs Recovery Drift">
            <PhysiologicalDriftGraph data={mockDriftData} height={isMobile ? 160 : 200} />
          </DashCard>
        </div>

        <div className="mb-6">
          <DashCard title="Sleep Architecture">
            <SleepStateChart segments={mockSleepSegments} totalMinutes={440} height={36} />
          </DashCard>
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ── INTELLIGENCE + STATUS GRID ───── */}
        {/* ═══════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-5 mb-6">
          {/* Left column */}
          <div className="space-y-4 sm:space-y-5">
            {/* AI Insights */}
            <DashCard title="AI Health Insights" badge={<LiveBadge />}>
              <InsightsList data={insights} isLoading={insightsLoading} />
            </DashCard>

            {/* Streaming Intelligence */}
            <DashCard title="Streaming Intelligence" badge={<ConnectionStatus compact />}>
              <StreamingInsightCards insights={mockStreamingInsights} />
            </DashCard>

            {/* Trend Chart */}
            <DashCard title="7-Day Trends">
              <TrendChart data={summary} isLoading={summaryLoading} />
            </DashCard>

            {/* Orchestration Intelligence */}
            <DashCard
              title="Wellness Intelligence"
              badge={<ConnectionStatus compact />}
            >
              <OrchestrationOverview
                twinState={{
                  wellness_score: 72,
                  stress_level: summary?.stress ?? 35,
                  recovery_score: 68,
                  resilience_score: 65,
                  archetype: "balanced",
                  identity_stability: 0.82,
                }}
                energyBudget={{
                  cognitive_load: 0.35,
                  intervention_fatigue: 0.2,
                  recovery_bandwidth: 0.72,
                  budget_remaining: 0.65,
                }}
                governance={{
                  ethical_compliance: true,
                  alignment_score: 0.88,
                  pacing_active: false,
                }}
              />
            </DashCard>
          </div>

          {/* Right column */}
          <div className="space-y-4 sm:space-y-5">
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

            {/* Burnout Risk */}
            <DashCard title="Burnout Risk">
              <BurnoutRiskIndicators
                interventionFatigue={0.2}
                cognitiveOverload={0.35}
                emotionalStrain={0.15}
                overallBurnoutRisk={22}
                suggestion="Low burnout risk — keep your current pace and recovery habits."
                compact={isMobile}
              />
            </DashCard>

            {/* Live Coaching */}
            <DashCard title="Adaptive Coaching">
              <LiveCoachingPanel
                nudges={mockCoachingNudges}
                coachPersonality="Supportive"
              />
            </DashCard>
          </div>
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ── STEP 3: DIGITAL TWIN UNIVERSE   */}
        {/* ═══════════════════════════════════ */}
        <SectionHeader icon="fa-dna">Your Digital Twin</SectionHeader>

        {/* Identity + Radar side-by-side */}
        <div className={`grid gap-4 sm:gap-5 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>
          <PhysiologicalIdentityCard
            archetype="balanced"
            identityStability={0.82}
            wellnessAge="Tracking for 4 months"
            coreTraits={mockTwinTraits}
            evolutionNote="Shifted from Active → Balanced over 6 weeks"
          />
          <DashCard title="Twin State">
            <TwinStateVisualizer dimensions={mockTwinDimensions} size={isMobile ? 160 : 200} compact={isMobile} />
          </DashCard>
        </div>

        {/* Resilience Evolution */}
        <div className="mb-5">
          <DashCard title="Resilience Evolution" badge={<LiveBadge />}>
            <ResilienceEvolutionPanel
              data={mockResilienceData}
              currentScore={72}
              growthPercent={18}
              insight="Your resilience baseline has grown steadily — your body is adapting well to your lifestyle changes."
              height={isMobile ? 150 : 180}
            />
          </DashCard>
        </div>

        {/* Adaptations + Memory side-by-side */}
        <div className={`grid gap-4 sm:gap-5 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <DashCard title="Behavioral Adaptations">
            <BehavioralAdaptationMap adaptations={mockAdaptations} />
          </DashCard>
          <DashCard title="Twin Memory">
            <TwinMemoryTimeline memories={mockMemories} maxVisible={4} />
          </DashCard>
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ── WELLNESS REFLECTION LAYER        */}
        {/* ═══════════════════════════════════ */}
        <SectionHeader icon="fa-book-open">Wellness Reflection</SectionHeader>

        <div className="mb-5">
          <WeeklyReflectionCard
            weekLabel="May 5 – May 11"
            narrative="This was a week of steady progress. Your body adapted well to the new evening routine, and your stress recovery times improved noticeably. The mid-week dip in sleep was expected after travel, but you bounced back quickly — a sign of growing resilience."
            highlights={mockWeekHighlights}
            moodTrend="improving"
            overallScore={74}
            encouragement="You're building sustainable habits, not chasing perfection. That's the foundation of lasting wellness."
          />
        </div>

        <div className={`grid gap-4 sm:gap-5 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <DashCard title="Recovery Reflection">
            <RecoveryReflectionSummary
              totalRecoveryScore={76}
              trend="improving"
              periods={mockRecoveryPeriods}
              insight="Your best recovery happens when you combine early sleep with screen-free evenings."
            />
          </DashCard>
          <DashCard title="Resilience Growth">
            <ResilienceGrowthHighlights
              highlights={mockResilienceHighlights}
              overallGrowth="Your resilience has grown 18% this month"
            />
          </DashCard>
        </div>

        <div className="mb-6">
          <DashCard title="Adaptive Lifestyle">
            <AdaptiveLifestyleInsights insights={mockLifestyleInsights} />
          </DashCard>
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ── WELLNESS ENERGY & CAPACITY       */}
        {/* ═══════════════════════════════════ */}
        <SectionHeader icon="fa-gauge-high">Wellness Energy</SectionHeader>
        <div className={`grid gap-4 sm:gap-5 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          <DashCard title="Wellness Capacity">
            <WellnessCapacityMeter
              capacity={68}
              cognitiveEnergy={0.65}
              physicalEnergy={0.7}
              emotionalEnergy={0.82}
              suggestion="Your capacity is moderate — focus on recovery-friendly activities."
              compact={isMobile}
            />
          </DashCard>
          <DashCard title="Cognitive Load">
            <CognitiveLoadIndicator
              currentLoad={0.35}
              bandwidth={0.75}
              sources={[
                { label: "Work tasks", contribution: 0.45 },
                { label: "Decision fatigue", contribution: 0.3 },
                { label: "Information intake", contribution: 0.25 },
              ]}
              suggestion="Your cognitive load is manageable — a good time for creative work."
              compact={isMobile}
            />
          </DashCard>
          <DashCard title="Recovery Bandwidth">
            <RecoveryBandwidthPanel
              recoveryBandwidth={0.72}
              interventionFatigue={0.2}
              restQuality={76}
              nextRecoveryWindow="In ~2 hours"
              suggestion="Your recovery bandwidth is healthy. Maintain current pace."
              compact={isMobile}
            />
          </DashCard>
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ── FUTURE SIMULATION EXPLORER       */}
        {/* ═══════════════════════════════════ */}
        <SectionHeader icon="fa-code-branch">Wellness Projections</SectionHeader>

        <div className="mb-5">
          <DashCard title="Explore Your Futures">
            <FutureScenarioExplorer
              scenarios={mockScenarios}
              outcomes={mockScenarioOutcomes}
              timeHorizon="Next 48 hours"
            />
          </DashCard>
        </div>

        <div className={`grid gap-4 sm:gap-5 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <DashCard title="Recovery Trajectory">
            <RecoveryTrajectoryViewer
              data={mockRecoveryTrajectory}
              currentRecovery={68}
              height={isMobile ? 160 : 200}
              insight="If you prioritize rest tonight, your recovery trajectory suggests improvement by morning."
            />
          </DashCard>
          <DashCard title="Stress Trajectory">
            <StressProjectionGraph
              data={mockStressProjection}
              currentStress={35}
              height={isMobile ? 160 : 200}
              mitigationStrategy="A 15-minute afternoon walk could help flatten this stress curve."
            />
          </DashCard>
        </div>

        <div className="mb-6">
          <DashCard title="Sleep Debt">
            <SleepDebtSimulation
              debtHours={2.5}
              debtTrend="reducing"
              impacts={mockSleepDebtImpacts}
              recoveryEstimate="~2 nights of 8hr rest"
              encouragement="Your sleep debt is reducing — you're on the right track. No need to rush recovery."
            />
          </DashCard>
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ── ORCHESTRATION & EXPLAINABILITY   */}
        {/* ═══════════════════════════════════ */}
        <SectionHeader icon="fa-sitemap">Wellness Orchestration</SectionHeader>

        <div className={`grid gap-4 sm:gap-5 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <DashCard title="System Priorities">
            <WellnessOrchestrationPanel
              priorities={mockOrchestrationPriorities}
              orchestrationMode="Recovery Focus"
              confidenceLevel={0.84}
              lastEvaluation="2 min ago"
            />
          </DashCard>
          <DashCard title="Agent Coordination">
            <AgentDecisionFlow
              agents={mockAgents}
              currentDecision="Prioritizing sleep recovery over activity targets to preserve healing capacity."
            />
          </DashCard>
        </div>

        <div className={`grid gap-4 sm:gap-5 mb-5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <DashCard title="Active Tradeoffs">
            <WellnessTradeoffVisualizer
              tradeoffs={mockTradeoffs}
              systemExplanation="The system is actively balancing competing wellness goals based on your current state."
            />
          </DashCard>
          <DashCard title="Decision Reasoning">
            <ReasoningChainViewer
              title="Why 'Movement Break' was suggested"
              steps={mockReasoningSteps}
              conclusion="A short walk is the best action to reduce your afternoon stress pattern."
              expandedByDefault
            />
          </DashCard>
        </div>

        <div className={`grid gap-4 sm:gap-5 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          <ConfidenceVisualization label="Recovery Projection" value={82} confidence={0.85} unit="%" uncertaintyRange={[76, 88]} />
          <ConfidenceVisualization label="Stress Projection" value={40} confidence={0.68} unit="%" uncertaintyRange={[32, 50]} />
          <ConfidenceVisualization label="Sleep Quality" value={76} confidence={0.78} unit="" uncertaintyRange={[70, 82]} />
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ── WELLNESS JOURNEY & ACHIEVEMENTS  */}
        {/* ═══════════════════════════════════ */}
        <SectionHeader icon="fa-road">Your Wellness Journey</SectionHeader>

        <div className={`grid gap-4 sm:gap-5 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-[2fr_1fr]"}`}>
          <DashCard title="Journey Timeline">
            <WellnessJourneyTimeline events={mockJourneyEvents} maxVisible={4} />
          </DashCard>
          <DashCard title="Achievements">
            <WellnessAchievementMilestones
              achievements={mockAchievements}
              encouragement="Achievements celebrate sustainable balance — not perfection."
            />
          </DashCard>
        </div>

        {/* ── Habit Coach ─────────────────── */}
        <SectionHeader icon="fa-seedling">Habit Coach</SectionHeader>
        <div className="mb-6">
          <HabitCards data={habits} isLoading={habitsLoading} />
        </div>

        {/* ── Quick Actions ────────────────── */}
        <SectionHeader icon="fa-bolt">Quick Actions</SectionHeader>
        <QuickActions />
      </div>
    </ErrorBoundary>
  );
}
