import { useState } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { TableSkeleton } from "@/shared/components/skeleton/TableSkeleton";
import { useAdminPredictions } from "../hooks/useAdmin";

export default function AdminPredictionsPage() {
  const {
    data, isLoading, page, setPage,
    search, setSearch, disease, setDisease,
  } = useAdminPredictions();

  const confColor = (c: number) =>
    c >= 85 ? theme.colors.health.recovery.DEFAULT
    : c >= 60 ? theme.colors.health.warning.DEFAULT
    : theme.colors.health.danger.DEFAULT;

  return (
    <ErrorBoundary>
      <div className="animate-page-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>
              AI Predictions
            </h1>
            <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>
              {data?.total || 0} total predictions across all users
            </p>
          </div>
          <div className="flex gap-3">
            {/* Search */}
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.colors.text.subtle }} />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search user/disease..."
                className="pl-9 pr-4 py-2.5 rounded-xl outline-none"
                style={{ background: theme.colors.surface[3], border: `1.5px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, fontSize: "16px", fontFamily: theme.typography.fonts.primary, width: "220px" }}
                onFocus={(e) => { e.target.style.borderColor = theme.colors.border.focus; }}
                onBlur={(e) => { e.target.style.borderColor = theme.colors.border[2]; }}
              />
            </div>
            {/* Filter by disease */}
            <div className="relative">
              <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.colors.text.subtle }} />
              <input type="text" value={disease} onChange={(e) => { setDisease(e.target.value); setPage(1); }}
                placeholder="Filter disease..."
                className="pl-9 pr-4 py-2.5 rounded-xl outline-none"
                style={{ background: theme.colors.surface[3], border: `1.5px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, fontSize: "16px", fontFamily: theme.typography.fonts.primary, width: "180px" }}
                onFocus={(e) => { e.target.style.borderColor = theme.colors.border.focus; }}
                onBlur={(e) => { e.target.style.borderColor = theme.colors.border[2]; }}
              />
            </div>
          </div>
        </div>

        {/* Predictions Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
          {isLoading ? <TableSkeleton rows={10} cols={6} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: theme.typography.sizes.sm }}>
                  <thead>
                    <tr style={{ background: theme.colors.surface[3] }}>
                      {["User", "Disease", "Confidence", "Symptoms", "Date"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-widest whitespace-nowrap"
                          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, borderBottom: `1px solid ${theme.colors.border[1]}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.predictions || []).map((p, i) => (
                      <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="hover:bg-white/[0.02] transition-colors"
                        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
                        <td className="px-4 py-3">
                          <div className="font-semibold" style={{ color: theme.colors.text.primary }}>{p.username}</div>
                          <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{p.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color: theme.colors.accent.primary }}>{p.predicted_disease}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: theme.colors.surface[4] }}>
                              <div className="h-full rounded-full" style={{ width: `${p.confidence}%`, background: confColor(p.confidence), transition: "width 0.5s" }} />
                            </div>
                            <span className="font-bold" style={{ color: confColor(p.confidence), fontSize: theme.typography.sizes.xs }}>{p.confidence}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ maxWidth: "220px" }}>
                          <span style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.xs }}>{p.symptoms}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
                          {new Date(p.created_at).toLocaleDateString("en-IN")}
                        </td>
                      </motion.tr>
                    ))}
                    {(data?.predictions || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center" style={{ color: theme.colors.text.subtle }}>
                          No predictions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
                  <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
                    Page {data.page} of {data.total_pages} · {data.total} predictions
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
