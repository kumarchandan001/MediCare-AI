import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useAIMonitor } from "../hooks/useAdmin";
import { MetricCardSkeleton } from "@/shared/components/skeleton/MetricCardSkeleton";
import { ChartSkeleton } from "@/shared/components/skeleton/ChartSkeleton";
import { TableSkeleton } from "@/shared/components/skeleton/TableSkeleton";

export default function AdminAIMonitorPage() {
  const { data, isLoading } = useAIMonitor();

  const confDistData = data ? [
    { name: "High (≥75%)", value: data.confidence_distribution.high, color: theme.colors.health.recovery.DEFAULT },
    { name: "Medium", value: data.confidence_distribution.medium, color: theme.colors.health.warning.DEFAULT },
    { name: "Low (<50%)", value: data.confidence_distribution.low, color: theme.colors.health.danger.DEFAULT },
  ] : [];

  const statCards = data ? [
    { label: "Total", value: data.total_predictions, color: theme.colors.accent.primary, icon: "fa-stethoscope" },
    { label: "Today", value: data.predictions_today, color: theme.colors.health.recovery.DEFAULT, icon: "fa-calendar-day" },
    { label: "This Week", value: data.predictions_this_week, color: theme.colors.health.strain.DEFAULT, icon: "fa-calendar-week" },
    { label: "Avg Confidence", value: `${data.avg_confidence.toFixed(1)}%`, color: theme.colors.health.sleep.DEFAULT, icon: "fa-gauge-high" },
    { label: "High Conf", value: data.high_confidence_count, color: theme.colors.health.recovery.DEFAULT, icon: "fa-circle-check" },
    { label: "Low Conf", value: data.low_confidence_count, color: theme.colors.health.warning.DEFAULT, icon: "fa-circle-exclamation" },
  ] : [];

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        <div className="mb-6">
          <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>AI Monitor</h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>Disease prediction performance and accuracy metrics</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {isLoading ? [1,2,3,4,5,6].map(i => <MetricCardSkeleton key={i} />) :
            statCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="p-4 rounded-xl" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold uppercase tracking-widest" style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>{s.label}</span>
                  <i className={`fas ${s.icon} text-xs`} style={{ color: s.color }} />
                </div>
                <div className="font-black" style={{ fontSize: theme.typography.sizes.metricLG, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                </div>
              </motion.div>
            ))
          }
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
              <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Top Predicted Diseases</span>
            </div>
            <div className="p-5">
              {isLoading ? <ChartSkeleton height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.top_predicted_diseases.slice(0, 7) || []} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: theme.colors.text.subtle, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="disease" tick={{ fill: theme.colors.text.muted, fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={{ background: theme.colors.surface[4], border: `1px solid ${theme.colors.border[2]}`, borderRadius: "12px", color: theme.colors.text.muted, fontSize: "11px" }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={theme.colors.accent.primary} fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
              <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Confidence Distribution</span>
            </div>
            <div className="p-5">
              {isLoading ? <ChartSkeleton height={200} /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={confDistData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {confDistData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                    </Pie>
                    <Legend formatter={(val) => <span style={{ color: theme.colors.text.muted, fontSize: "11px" }}>{val}</span>} />
                    <Tooltip contentStyle={{ background: theme.colors.surface[4], border: `1px solid ${theme.colors.border[2]}`, borderRadius: "12px", color: theme.colors.text.muted, fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Recent predictions table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
            <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Recent Predictions</span>
          </div>
          {isLoading ? <TableSkeleton rows={5} cols={4} /> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ fontSize: theme.typography.sizes.sm }}>
                <thead>
                  <tr style={{ background: theme.colors.surface[3] }}>
                    {["Disease", "Confidence", "Symptoms", "Date"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-widest"
                        style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, borderBottom: `1px solid ${theme.colors.border[1]}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent_predictions || []).map((pred) => (
                    <tr key={pred.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: theme.colors.text.primary }}>{pred.disease}</td>
                      <td className="px-4 py-3">
                        <span className="font-black" style={{
                          color: pred.conf >= 75 ? theme.colors.health.recovery.DEFAULT : pred.conf >= 50 ? theme.colors.health.warning.DEFAULT : theme.colors.health.danger.DEFAULT,
                        }}>{pred.conf.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xs }}>{pred.symptoms}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xs }}>{pred.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
