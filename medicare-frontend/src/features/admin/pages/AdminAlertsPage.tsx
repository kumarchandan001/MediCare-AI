import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { TableSkeleton } from "@/shared/components/skeleton/TableSkeleton";
import { useAdminAlerts } from "../hooks/useAdmin";

const SEVERITY_OPTIONS = ["", "info", "low", "medium", "high", "critical"];

export default function AdminAlertsPage() {
  const {
    data, isLoading, page, setPage,
    severity, setSeverity,
    unreadOnly, setUnread,
    resolveAlert, deleteAlert,
    isResolving, isDeleting,
  } = useAdminAlerts();

  const sevStyle = (sev: string) => {
    switch (sev) {
      case "critical": return { bg: theme.colors.health.danger.bg, color: theme.colors.health.danger.DEFAULT, border: theme.colors.health.danger.border };
      case "high": return { bg: theme.colors.health.warning.bg, color: "#FF6D00", border: theme.colors.health.warning.border };
      case "medium": return { bg: theme.colors.health.warning.bg, color: theme.colors.health.warning.DEFAULT, border: theme.colors.health.warning.border };
      case "low": return { bg: theme.colors.health.recovery.bg, color: theme.colors.health.recovery.DEFAULT, border: theme.colors.health.recovery.border };
      default: return { bg: theme.colors.accent.subtle, color: theme.colors.accent.primary, border: theme.colors.accent.border };
    }
  };

  return (
    <ErrorBoundary>
      <div className="animate-page-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>
              Platform Alerts
            </h1>
            <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>
              {data?.total || 0} total alerts
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* Severity filter */}
            <select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="px-4 py-2.5 rounded-xl outline-none appearance-none cursor-pointer"
              style={{ background: theme.colors.surface[3], border: `1.5px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, fontSize: "16px", fontFamily: theme.typography.fonts.primary, minWidth: "140px" }}>
              {SEVERITY_OPTIONS.map(o => (
                <option key={o} value={o}>{o ? o.charAt(0).toUpperCase() + o.slice(1) : "All Severity"}</option>
              ))}
            </select>
            {/* Unread toggle */}
            <button onClick={() => { setUnread(!unreadOnly); setPage(1); }}
              className="px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all"
              style={{
                fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary,
                background: unreadOnly ? `${theme.colors.accent.primary}15` : theme.colors.surface[3],
                color: unreadOnly ? theme.colors.accent.primary : theme.colors.text.muted,
                border: `1.5px solid ${unreadOnly ? theme.colors.accent.primary : theme.colors.border[2]}`,
              }}>
              <i className="fas fa-envelope mr-2" />
              {unreadOnly ? "Showing Unread" : "All Alerts"}
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
          {isLoading ? <TableSkeleton rows={10} cols={5} /> : (
            <>
              <div className="space-y-0">
                {(data?.alerts || []).length === 0 ? (
                  <div className="px-5 py-10 text-center" style={{ color: theme.colors.text.subtle }}>No alerts found.</div>
                ) : data?.alerts.map((alert, i) => {
                  const s = sevStyle(alert.severity);
                  return (
                    <motion.div key={alert.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      className="flex items-start gap-4 px-5 py-4"
                      style={{
                        borderBottom: `1px solid ${theme.colors.border[1]}`,
                        background: !alert.is_read ? `${s.color}04` : "transparent",
                      }}>
                      {/* Severity dot */}
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}60` }} />
                      </div>

                      {/* Alert content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold" style={{ color: theme.colors.text.primary, fontSize: theme.typography.sizes.sm }}>{alert.title}</span>
                          <span className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ fontSize: "0.55rem", background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                            {alert.severity}
                          </span>
                          {!alert.is_read && (
                            <span className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ fontSize: "0.55rem", background: `${theme.colors.accent.primary}15`, color: theme.colors.accent.primary }}>
                              Unread
                            </span>
                          )}
                          {alert.category && (
                            <span style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>· {alert.category}</span>
                          )}
                        </div>
                        {alert.message && <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted, lineHeight: 1.4 }}>{alert.message}</p>}
                        <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, marginTop: "4px" }}>
                          <i className="fas fa-user mr-1" />{alert.username} ({alert.email}) · {new Date(alert.created_at).toLocaleString("en-IN")}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        {!alert.is_read && (
                          <button onClick={() => resolveAlert(alert.id)} disabled={isResolving}
                            className="px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                            style={{ fontSize: "0.6rem", fontFamily: theme.typography.fonts.primary, background: theme.colors.health.recovery.bg, color: theme.colors.health.recovery.DEFAULT, minHeight: "28px" }}>
                            <i className="fas fa-check mr-1" />Resolve
                          </button>
                        )}
                        <button onClick={() => deleteAlert(alert.id)} disabled={isDeleting}
                          className="px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          style={{ fontSize: "0.6rem", fontFamily: theme.typography.fonts.primary, background: theme.colors.health.danger.bg, color: theme.colors.health.danger.DEFAULT, minHeight: "28px" }}>
                          <i className="fas fa-trash-can" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination */}
              {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
                  <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
                    Page {data.page} of {data.total_pages} · {data.total} alerts
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                      style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, background: theme.colors.surface[3], color: theme.colors.text.muted, minHeight: "36px" }}>Prev</button>
                    <button onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page >= data.total_pages}
                      className="px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                      style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, background: theme.colors.accent.primary, color: theme.colors.bg.primary, minHeight: "36px" }}>Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
