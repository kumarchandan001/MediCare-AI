import { motion } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useHealthIntelligence } from "../hooks/useAdmin";
import { MetricCardSkeleton } from "@/shared/components/skeleton/MetricCardSkeleton";
import { ChartSkeleton } from "@/shared/components/skeleton/ChartSkeleton";

const CHART_COLORS = [
  theme.colors.accent.primary,
  theme.colors.health.strain.DEFAULT,
  theme.colors.health.sleep.DEFAULT,
  theme.colors.health.warning.DEFAULT,
  theme.colors.health.danger.DEFAULT,
  theme.colors.health.recovery.DEFAULT,
  "#8B5CF6",
  "#06B6D4",
];

function IntelCard({ label, value, sublabel, icon, color, index = 0 }: {
  label: string; value: string | number; sublabel: string; icon: string; color: string; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
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
      <div className="font-black mb-1 leading-none" style={{ fontSize: theme.typography.sizes.metricLG, color: theme.colors.text.primary, letterSpacing: "-0.04em" }}>
        {value}
      </div>
      <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{sublabel}</div>
    </motion.div>
  );
}

function ChartSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
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

export default function AdminHealthIntelPage() {
  const { data: health, isLoading } = useHealthIntelligence();

  if (isLoading) {
    return (
      <div className="animate-page-in">
        <div className="mb-6">
          <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>
            Health Intelligence
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>
            Platform-wide health analytics and insights
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6].map(i => <MetricCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartSkeleton height={280} />
          <ChartSkeleton height={280} />
        </div>
      </div>
    );
  }

  if (!health) return null;

  const METRICS = [
    { label: "Avg Sleep", value: `${health.avg_sleep_platform}h`, sublabel: "Platform average sleep", icon: "fa-moon", color: theme.colors.health.sleep.DEFAULT },
    { label: "Avg Heart Rate", value: `${health.avg_heart_rate_platform.toFixed(0)} bpm`, sublabel: "Resting heart rate", icon: "fa-heart-pulse", color: theme.colors.health.danger.DEFAULT },
    { label: "Avg Stress", value: `${health.avg_stress_platform.toFixed(1)}/10`, sublabel: "Stress index", icon: "fa-brain", color: theme.colors.health.warning.DEFAULT },
    { label: "Avg SpO2", value: `${health.avg_oxygen_platform.toFixed(1)}%`, sublabel: "Blood oxygen level", icon: "fa-lungs", color: theme.colors.health.strain.DEFAULT },
    { label: "Avg Steps", value: `${(health.avg_steps_platform / 1000).toFixed(1)}k`, sublabel: "Daily steps", icon: "fa-person-walking", color: theme.colors.accent.primary },
    { label: "Avg BMI", value: `${health.avg_bmi_platform.toFixed(1)}`, sublabel: "Body mass index", icon: "fa-weight-scale", color: theme.colors.health.recovery.DEFAULT },
  ];

  // Risk distribution for pie chart
  const riskData = Object.entries(health.risk_distribution || {}).map(([name, value]) => ({ name, value }));
  const riskColors: Record<string, string> = {
    Low: theme.colors.health.recovery.DEFAULT,
    Moderate: theme.colors.health.warning.DEFAULT,
    High: "#FF6D00",
    Critical: theme.colors.health.danger.DEFAULT,
  };

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>
            Health Intelligence
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>
            Platform-wide health analytics and insights
          </p>
        </div>

        {/* Platform Health Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {METRICS.map((m, i) => <IntelCard key={m.label} {...m} index={i} />)}
        </div>

        {/* Warning Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Low Sleep Users", value: health.users_with_low_sleep, icon: "fa-moon", color: theme.colors.health.sleep.DEFAULT, desc: "Users sleeping < 6h avg" },
            { label: "High Stress Users", value: health.users_with_high_stress, icon: "fa-brain", color: theme.colors.health.warning.DEFAULT, desc: "Stress level ≥ 7/10" },
            { label: "High Risk Users", value: health.users_with_high_risk, icon: "fa-triangle-exclamation", color: theme.colors.health.danger.DEFAULT, desc: "Elevated health risk score" },
          ].map((w, i) => (
            <motion.div key={w.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-4 p-5 rounded-xl"
              style={{ background: `${w.color}08`, border: `1px solid ${w.color}20` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${w.color}15`, border: `1px solid ${w.color}30` }}>
                <i className={`fas ${w.icon}`} style={{ color: w.color }} />
              </div>
              <div>
                <div className="font-black leading-none" style={{ fontSize: theme.typography.sizes.h1, color: w.color, letterSpacing: "-0.04em" }}>
                  {w.value}
                </div>
                <div className="font-bold" style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.primary, marginTop: "2px" }}>{w.label}</div>
                <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{w.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Top Diseases */}
          <ChartSection title="Top Predicted Diseases" icon="fa-stethoscope">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={(health.top_diseases || []).slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="disease" tick={{ fill: theme.colors.text.muted, fontSize: 9 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: theme.colors.surface[4], border: `1px solid ${theme.colors.border[2]}`, borderRadius: "12px", color: theme.colors.text.muted, fontSize: "11px" }}
                  formatter={(value: number, name: string) => {
                    if (name === "count") return [value, "Cases"];
                    if (name === "avg_confidence") return [`${(value as number).toFixed(1)}%`, "Avg Confidence"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} name="count">
                  {(health.top_diseases || []).slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* Risk Distribution */}
          <ChartSection title="Risk Distribution" icon="fa-shield-halved">
            {riskData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={240}>
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      dataKey="value" nameKey="name"
                      strokeWidth={0}
                    >
                      {riskData.map((entry, i) => (
                        <Cell key={i} fill={riskColors[entry.name] || CHART_COLORS[i]} fillOpacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: theme.colors.surface[4], border: `1px solid ${theme.colors.border[2]}`, borderRadius: "12px", color: theme.colors.text.muted, fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {riskData.map((entry) => {
                    const total = riskData.reduce((s, e) => s + e.value, 0);
                    const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
                    const color = riskColors[entry.name] || theme.colors.text.subtle;
                    return (
                      <div key={entry.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold" style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.primary }}>{entry.name}</span>
                            <span className="font-bold" style={{ fontSize: theme.typography.sizes.xs, color }}>{entry.value} ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full mt-1" style={{ background: theme.colors.surface[4] }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 0.6s" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-60" style={{ color: theme.colors.text.subtle }}>No risk data available.</div>
            )}
          </ChartSection>
        </div>

        {/* Daily Active Users */}
        <ChartSection title="Daily Active Users (30 Days)" icon="fa-chart-area">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={health.daily_active_users || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="intel-dau-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.colors.accent.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={theme.colors.accent.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: theme.colors.surface[4], border: `1px solid ${theme.colors.border[2]}`, borderRadius: "12px", color: theme.colors.text.muted, fontSize: "11px" }} />
              <Area type="monotone" dataKey="count" stroke={theme.colors.accent.primary} strokeWidth={2.5} fill="url(#intel-dau-grad)" dot={false} activeDot={{ r: 4, fill: theme.colors.accent.primary, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>
      </div>
    </ErrorBoundary>
  );
}
