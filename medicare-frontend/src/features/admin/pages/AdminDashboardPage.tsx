import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useAdminStats, useHealthIntelligence } from "../hooks/useAdmin";
import { MetricCardSkeleton } from "@/shared/components/skeleton/MetricCardSkeleton";
import { ChartSkeleton } from "@/shared/components/skeleton/ChartSkeleton";

function AdminStatCard({ label, value, sublabel, icon, color, trend, index = 0 }: {
  label: string; value: string | number; sublabel: string; icon: string; color: string;
  trend?: { value: number; label: string }; index?: number;
}) {
  const isPositive = (trend?.value || 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-xl p-5 relative overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.7 }} />
      <div className="flex items-start justify-between mb-3">
        <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <i className={`fas ${icon} text-xs`} style={{ color }} />
        </div>
      </div>
      <div className="font-black mb-2 leading-none" style={{ fontSize: theme.typography.sizes.metricLG, color: theme.colors.text.primary, letterSpacing: "-0.04em" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {trend ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold" style={{
            fontSize: theme.typography.sizes.xxs,
            background: isPositive ? theme.colors.health.recovery.bg : theme.colors.health.danger.bg,
            color: isPositive ? theme.colors.health.recovery.DEFAULT : theme.colors.health.danger.DEFAULT,
          }}>
            <i className={`fas fa-arrow-${isPositive ? "up" : "down"} text-xs`} />
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{trend.label}</span>
        </div>
      ) : (
        <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{sublabel}</div>
      )}
    </motion.div>
  );
}

function AdminChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
        <i className={`fas ${icon} text-xs`} style={{ color: theme.colors.health.warning.DEFAULT }} />
        <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: health, isLoading: healthLoading } = useHealthIntelligence();

  const STAT_CARDS = stats ? [
    { label: "Total Users", value: stats.total_users, sublabel: "Registered accounts", icon: "fa-users", color: theme.colors.accent.primary, trend: { value: stats.user_growth_pct, label: "this month" } },
    { label: "Active Today", value: stats.active_today, sublabel: "Users who logged data", icon: "fa-person-running", color: theme.colors.health.recovery.DEFAULT },
    { label: "New This Week", value: stats.new_this_week, sublabel: "New registrations", icon: "fa-user-plus", color: theme.colors.health.strain.DEFAULT },
    { label: "AI Predictions", value: stats.total_predictions, sublabel: `${stats.predictions_today} today`, icon: "fa-stethoscope", color: theme.colors.health.sleep.DEFAULT },
    { label: "Health Records", value: stats.total_vitals, sublabel: "Total vitals logged", icon: "fa-heart-pulse", color: theme.colors.health.danger.DEFAULT },
    { label: "Chat Messages", value: stats.total_chats, sublabel: "AI conversations", icon: "fa-robot", color: theme.colors.health.warning.DEFAULT },
    { label: "Active Alerts", value: stats.total_alerts, sublabel: `${stats.critical_alerts} critical`, icon: "fa-bell", color: theme.colors.health.danger.DEFAULT },
    { label: "Avg Health Score", value: `${stats.avg_health_score}%`, sublabel: "Platform average", icon: "fa-chart-line", color: theme.colors.accent.primary },
  ] : [];

  const CHART_COLORS = [
    theme.colors.accent.primary, theme.colors.health.strain.DEFAULT, theme.colors.health.sleep.DEFAULT,
    theme.colors.health.warning.DEFAULT, theme.colors.health.danger.DEFAULT, theme.colors.health.recovery.DEFAULT,
  ];

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        <div className="mb-6">
          <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>
            Platform Overview
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>
            Real-time MediCare AI platform statistics
          </p>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          {statsLoading
            ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <MetricCardSkeleton key={i} />)
            : STAT_CARDS.map((card, i) => <AdminStatCard key={card.label} {...card} index={i} />)
          }
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <AdminChartCard title="Daily Active Users" icon="fa-users">
            {healthLoading ? <ChartSkeleton height={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={health?.daily_active_users || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dau-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.colors.accent.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={theme.colors.accent.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: theme.colors.surface[4], border: `1px solid ${theme.colors.border[2]}`, borderRadius: "12px", color: theme.colors.text.muted, fontSize: "11px" }} />
                  <Area type="monotone" dataKey="count" stroke={theme.colors.accent.primary} strokeWidth={2} fill="url(#dau-grad)" dot={false} activeDot={{ r: 4, fill: theme.colors.accent.primary }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </AdminChartCard>

          <AdminChartCard title="Top Predicted Diseases" icon="fa-stethoscope">
            {healthLoading ? <ChartSkeleton height={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(health?.top_diseases || []).slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="disease" tick={{ fill: theme.colors.text.muted, fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background: theme.colors.surface[4], border: `1px solid ${theme.colors.border[2]}`, borderRadius: "12px", color: theme.colors.text.muted, fontSize: "11px" }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {(health?.top_diseases || []).slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % 6]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </AdminChartCard>
        </div>

        {/* Platform health metrics */}
        <AdminChartCard title="Platform Health Averages" icon="fa-heart-pulse">
          {healthLoading ? <ChartSkeleton height={80} /> : health ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Avg Sleep", value: `${health.avg_sleep_platform}h`, color: theme.colors.health.sleep.DEFAULT },
                { label: "Avg HR", value: `${health.avg_heart_rate_platform.toFixed(0)} bpm`, color: theme.colors.health.danger.DEFAULT },
                { label: "Avg Stress", value: `${health.avg_stress_platform.toFixed(1)}/10`, color: theme.colors.health.warning.DEFAULT },
                { label: "Avg SpO2", value: `${health.avg_oxygen_platform.toFixed(1)}%`, color: theme.colors.health.strain.DEFAULT },
                { label: "Avg Steps", value: `${(health.avg_steps_platform / 1000).toFixed(1)}k`, color: theme.colors.accent.primary },
                { label: "Avg BMI", value: `${health.avg_bmi_platform.toFixed(1)}`, color: theme.colors.health.recovery.DEFAULT },
              ].map((m) => (
                <div key={m.label} className="text-center p-4 rounded-xl" style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}>
                  <div className="font-black leading-none mb-1" style={{ fontSize: theme.typography.sizes.h2, color: m.color, letterSpacing: "-0.04em" }}>{m.value}</div>
                  <div className="font-bold uppercase tracking-wider" style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>{m.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </AdminChartCard>
      </div>
    </ErrorBoundary>
  );
}
