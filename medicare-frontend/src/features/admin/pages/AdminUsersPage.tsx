import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useAdminUsers } from "../hooks/useAdmin";
import { TableSkeleton } from "@/shared/components/skeleton/TableSkeleton";
import type { AdminUser } from "../types/admin.types";


/* ── Main Users Page ───────────────────── */
export default function AdminUsersPage() {
  const { data, isLoading, page, setPage, search, setSearch } = useAdminUsers();
  const navigate = useNavigate();

  const statusBadge = (user: AdminUser) => {
    if (!user.is_active) return { label: "Inactive", color: theme.colors.health.danger.DEFAULT, bg: theme.colors.health.danger.bg };
    if (user.account_locked) return { label: "Locked", color: theme.colors.health.warning.DEFAULT, bg: theme.colors.health.warning.bg };
    if (!user.email_verified) return { label: "Unverified", color: theme.colors.health.strain.DEFAULT, bg: theme.colors.health.strain.bg };
    if (user.is_admin) return { label: "Admin", color: theme.colors.health.warning.DEFAULT, bg: `${theme.colors.health.warning.DEFAULT}15` };
    return { label: "Active", color: theme.colors.health.recovery.DEFAULT, bg: theme.colors.health.recovery.bg };
  };

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>User Management</h1>
            <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>{data?.total || 0} total users</p>
          </div>
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.colors.text.subtle }} />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search users..."
              className="pl-9 pr-4 py-2.5 rounded-xl outline-none"
              style={{ background: theme.colors.surface[3], border: `1.5px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, fontSize: "16px", fontFamily: theme.typography.fonts.primary, width: "220px" }}
              onFocus={(e) => { e.target.style.borderColor = theme.colors.border.focus; }}
              onBlur={(e) => { e.target.style.borderColor = theme.colors.border[2]; }}
            />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
          {isLoading ? <TableSkeleton rows={8} cols={6} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: theme.typography.sizes.sm }}>
                  <thead>
                    <tr style={{ background: theme.colors.surface[3] }}>
                      {["User", "Status", "Records", "Predictions", "Joined", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-widest whitespace-nowrap"
                          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, borderBottom: `1px solid ${theme.colors.border[1]}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.users || []).map((user, i) => {
                      const badge = statusBadge(user);
                      return (
                        <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="transition-colors hover:bg-white/[0.02] cursor-pointer"
                          style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
                          onClick={() => navigate(`/admin/users/${user.id}`)}>
                          <td className="px-4 py-3">
                            <div className="font-semibold" style={{ color: theme.colors.text.primary }}>{user.username}</div>
                            <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full font-bold uppercase tracking-wider" style={{ fontSize: "0.6rem", background: badge.bg, color: badge.color }}>{badge.label}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold" style={{ color: theme.colors.text.muted }}>{user.health_records}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: theme.colors.text.muted }}>{user.predictions}</td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
                            {new Date(user.created_at).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${user.id}`); }}
                              className="px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors"
                              style={{ fontSize: "0.6rem", fontFamily: theme.typography.fonts.primary, background: theme.colors.accent.subtle, color: theme.colors.accent.primary, minHeight: "32px" }}>
                              View
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
                  <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>Page {data.page} of {data.total_pages} · {data.total} users</span>
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

