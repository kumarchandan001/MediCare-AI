import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { TableSkeleton } from "@/shared/components/skeleton/TableSkeleton";
import { useAuditLog } from "../hooks/useAdmin";

const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
  delete_user:          { icon: "fa-trash-can",      color: theme.colors.health.danger.DEFAULT },
  promote_admin:        { icon: "fa-user-shield",    color: theme.colors.health.warning.DEFAULT },
  demote_admin:         { icon: "fa-user-minus",     color: theme.colors.health.strain.DEFAULT },
  reset_user_password:  { icon: "fa-key",            color: theme.colors.accent.primary },
  clear_cache:          { icon: "fa-broom",          color: theme.colors.health.sleep.DEFAULT },
  update_setting:       { icon: "fa-sliders",        color: theme.colors.health.recovery.DEFAULT },
  broadcast_message:    { icon: "fa-bullhorn",       color: theme.colors.health.warning.DEFAULT },
  export_users:         { icon: "fa-file-csv",       color: theme.colors.accent.primary },
  export_predictions:   { icon: "fa-file-csv",       color: theme.colors.accent.primary },
  resolve_alert:        { icon: "fa-check",          color: theme.colors.health.recovery.DEFAULT },
  delete_alert:         { icon: "fa-trash-can",      color: theme.colors.health.danger.DEFAULT },
};

export default function AdminAuditLogPage() {
  const { data, isLoading, page, setPage, filter, setFilter } = useAuditLog();

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>
              Audit Log
            </h1>
            <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>
              {data?.total || 0} recorded admin actions
            </p>
          </div>
          <div className="relative">
            <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.colors.text.subtle }} />
            <input type="text" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              placeholder="Filter by action..."
              className="pl-9 pr-4 py-2.5 rounded-xl outline-none"
              style={{ background: theme.colors.surface[3], border: `1.5px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, fontSize: "16px", fontFamily: theme.typography.fonts.primary, width: "220px" }}
              onFocus={(e) => { e.target.style.borderColor = theme.colors.border.focus; }}
              onBlur={(e) => { e.target.style.borderColor = theme.colors.border[2]; }}
            />
          </div>
        </div>

        {/* Log Timeline */}
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
          {isLoading ? <TableSkeleton rows={10} cols={4} /> : (
            <>
              <div className="divide-y" style={{ borderColor: theme.colors.border[1] }}>
                {(data?.logs || []).length === 0 ? (
                  <div className="px-5 py-10 text-center" style={{ color: theme.colors.text.subtle }}>No audit logs found.</div>
                ) : data?.logs.map((log, i) => {
                  const ai = ACTION_ICONS[log.action] || { icon: "fa-circle-info", color: theme.colors.text.subtle };
                  return (
                    <motion.div key={log.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-4 px-5 py-4"
                      style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>

                      {/* Action icon */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${ai.color}12`, border: `1px solid ${ai.color}25` }}>
                        <i className={`fas ${ai.icon} text-sm`} style={{ color: ai.color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{
                            fontSize: "0.6rem", background: `${ai.color}12`, color: ai.color, border: `1px solid ${ai.color}20`,
                          }}>{log.action.replace(/_/g, " ")}</span>
                          {log.target_type && (
                            <span style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
                              → {log.target_type}{log.target_id ? ` #${log.target_id}` : ""}
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted, marginTop: "4px" }}>{log.details}</p>
                        )}
                        <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, marginTop: "2px" }}>
                          <i className="fas fa-user-shield mr-1" />{log.admin_email}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex-shrink-0 text-right">
                        <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
                          {new Date(log.created_at).toLocaleDateString("en-IN")}
                        </div>
                        <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
                          {new Date(log.created_at).toLocaleTimeString("en-IN")}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination */}
              {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
                  <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
                    Page {data.page} of {data.total_pages} · {data.total} entries
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
