import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useSystemHealth } from "../hooks/useAdmin";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status === "ok" || status === "loaded" || status === "healthy";
  const isWarn = status === "warning" || status === "low" || status === "unavailable";
  const color = isOk ? theme.colors.health.recovery.DEFAULT : isWarn ? theme.colors.health.warning.DEFAULT : theme.colors.health.danger.DEFAULT;
  const bg = isOk ? theme.colors.health.recovery.bg : isWarn ? theme.colors.health.warning.bg : theme.colors.health.danger.bg;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider" style={{ fontSize: "0.6rem", background: bg, color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, animation: isOk ? "pulse 2s infinite" : "none" }} />
      {status}
    </span>
  );
}

function ServiceCard({ title, icon, status, latency, details, index }: {
  title: string; icon: string; status: string; latency?: number;
  details: Array<{ label: string; value: string }>; index: number;
}) {
  const isOk = status === "ok" || status === "loaded";
  const color = isOk ? theme.colors.health.recovery.DEFAULT : theme.colors.health.danger.DEFAULT;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${isOk ? theme.colors.border[1] : theme.colors.health.danger.border}` }}>
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}`, background: `${color}06` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
            <i className={`fas ${icon} text-sm`} style={{ color }} />
          </div>
          <div>
            <div className="font-bold" style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary }}>{title}</div>
            {latency !== undefined && <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{latency.toFixed(1)} ms latency</div>}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="px-5 py-4 space-y-2">
        {details.map((d) => (
          <div key={d.label} className="flex justify-between items-center py-1" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
            <span className="font-medium" style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>{d.label}</span>
            <span className="font-semibold" style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted }}>{d.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function AdminSystemHealthPage() {
  const { data, isLoading, refetch } = useSystemHealth();

  const overallColor = data?.status === "healthy" ? theme.colors.health.recovery.DEFAULT
    : data?.status === "warning" ? theme.colors.health.warning.DEFAULT : theme.colors.health.danger.DEFAULT;

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>System Health</h1>
            <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>Infrastructure status and performance metrics</p>
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all"
            style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, background: theme.colors.surface[3], color: theme.colors.text.muted, minHeight: "40px" }}>
            {isLoading ? <SpinnerLoader size="sm" /> : <i className="fas fa-rotate-right text-xs" />}
            Refresh
          </button>
        </div>

        {isLoading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <SpinnerLoader size="lg" />
              <p className="mt-4" style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle }}>Checking system health...</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Overall status */}
            <div className="flex items-center gap-4 p-5 rounded-2xl mb-6"
              style={{ background: `${overallColor}08`, border: `1px solid ${overallColor}20`, borderLeft: `4px solid ${overallColor}` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${overallColor}15` }}>
                <i className={`fas fa-${data.status === "healthy" ? "circle-check" : "triangle-exclamation"} text-xl`} style={{ color: overallColor }} />
              </div>
              <div className="flex-1">
                <div className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h3, color: overallColor, letterSpacing: "-0.02em" }}>
                  System {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                </div>
                <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle, marginTop: "2px" }}>
                  Uptime: {formatUptime(data.uptime_seconds)} · API v{data.api_version} · Checked: {new Date(data.last_checked).toLocaleTimeString("en-IN")}
                </div>
              </div>
            </div>

            {/* Service cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <ServiceCard title="PostgreSQL Database" icon="fa-database" status={data.database.status} latency={data.database.latency_ms} index={0}
                details={[{ label: "Provider", value: data.database.provider || "PostgreSQL" }, { label: "Latency", value: `${data.database.latency_ms} ms` }, { label: "Connection", value: data.database.status }]} />
              <ServiceCard title={data.cache?.provider === "In-Memory LRU" ? "Cache (In-Memory)" : "Cache (Redis)"} icon="fa-bolt" status={data.cache?.status || "unknown"} latency={data.cache?.latency_ms} index={1}
                details={[
                  { label: "Provider", value: data.cache?.provider || "Cache" },
                  { label: "Backend", value: data.cache?.backend || "unknown" },
                  { label: "Entries", value: `${data.cache?.memory_entries ?? 0} / ${data.cache?.memory_max ?? 512}` },
                  { label: "Status", value: data.cache?.status || "unknown" },
                ]} />
              <ServiceCard title="ML Models" icon="fa-brain" status={data.ml_models.status} index={2}
                details={(data.ml_models.files || []).map((f: string) => ({ label: f, value: "✓ loaded" }))} />
              <ServiceCard title="Disk Storage" icon="fa-hard-drive" status={data.disk.status} index={3}
                details={[{ label: "Total", value: `${data.disk.total_gb} GB` }, { label: "Used", value: `${data.disk.used_gb} GB (${data.disk.used_pct}%)` }, { label: "Free", value: `${data.disk.free_gb} GB` }]} />
            </div>

            {/* Disk usage bar */}
            {data.disk.total_gb > 0 && (
              <div className="p-5 rounded-2xl" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Disk Usage</span>
                  <span className="font-black" style={{ fontSize: theme.typography.sizes.sm, color: data.disk.used_pct > 80 ? theme.colors.health.danger.DEFAULT : theme.colors.accent.primary }}>
                    {data.disk.used_pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="h-full rounded-full" initial={{ width: "0%" }} animate={{ width: `${data.disk.used_pct}%` }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    style={{ background: data.disk.used_pct > 80 ? theme.colors.health.danger.DEFAULT : theme.colors.accent.primary }} />
                </div>
                <div className="flex justify-between mt-2" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
                  <span>{data.disk.used_gb} GB used</span>
                  <span>{data.disk.free_gb} GB free of {data.disk.total_gb} GB</span>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
