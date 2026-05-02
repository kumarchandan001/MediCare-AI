import { useState } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { TableSkeleton } from "@/shared/components/skeleton/TableSkeleton";
import GoogleFitBadge from "@/features/googleFit/components/GoogleFitBadge";
import type { HealthHistoryItem } from "../types/health.types";

interface HistoryTableProps {
  data: HealthHistoryItem[] | undefined;
  isLoading: boolean;
}

const COLUMNS = [
  { key: "date", label: "Date" },
  { key: "sleep", label: "Sleep (h)" },
  { key: "heart_rate", label: "HR (bpm)" },
  { key: "oxygen", label: "SpO2 (%)" },
  { key: "stress", label: "Stress /10" },
  { key: "temperature", label: "Temp (°F)" },
  { key: "notes", label: "Notes" },
];

function getCellColor(key: string, value: unknown): string {
  if (value === null || value === undefined) return theme.colors.text.subtle;
  const num = Number(value);

  switch (key) {
    case "sleep":
      if (num >= 8) return theme.colors.health.recovery.DEFAULT;
      if (num >= 6) return theme.colors.text.muted;
      return theme.colors.health.danger.DEFAULT;
    case "heart_rate":
      if (num >= 60 && num <= 80) return theme.colors.health.recovery.DEFAULT;
      if (num > 100 || num < 50) return theme.colors.health.danger.DEFAULT;
      return theme.colors.health.warning.DEFAULT;
    case "oxygen":
      if (num >= 97) return theme.colors.health.recovery.DEFAULT;
      if (num >= 95) return theme.colors.text.muted;
      return theme.colors.health.danger.DEFAULT;
    case "stress":
      if (num <= 3) return theme.colors.health.recovery.DEFAULT;
      if (num >= 7) return theme.colors.health.danger.DEFAULT;
      return theme.colors.health.warning.DEFAULT;
    default:
      return theme.colors.text.muted;
  }
}

export function HealthHistoryTable({ data, isLoading }: HistoryTableProps) {
  const [filter, setFilter] = useState("");

  if (isLoading) {
    return <TableSkeleton rows={5} cols={7} />;
  }

  const filtered = (data || []).filter(
    (item) =>
      !filter ||
      item.date?.includes(filter) ||
      item.notes?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.accent.primary }} />
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
          >
            Health History
          </span>
          <span
            className="px-2 py-0.5 rounded-full"
            style={{ fontSize: theme.typography.sizes.xxs, background: theme.colors.surface[4], color: theme.colors.text.muted }}
          >
            {filtered.length} records
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <i
            className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: theme.colors.text.subtle }}
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="pl-8 pr-4 py-2 rounded-xl outline-none text-xs"
            style={{
              background: theme.colors.surface[3],
              border: `1.5px solid ${theme.colors.border[2]}`,
              color: theme.colors.text.primary,
              fontFamily: theme.typography.fonts.primary,
              width: "160px",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = theme.colors.border.focus;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = theme.colors.border[2];
            }}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: theme.colors.text.subtle }}>
          <i className="fas fa-database text-3xl mb-3 block" style={{ opacity: 0.3 }} />
          <p style={{ fontSize: theme.typography.sizes.sm }}>
            {data?.length === 0 ? "No health records yet. Start logging vitals!" : "No records match your filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: theme.typography.sizes.sm }}>
            <thead>
              <tr style={{ background: theme.colors.surface[3] }}>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{
                      fontSize: theme.typography.sizes.xxs,
                      color: theme.colors.text.subtle,
                      borderBottom: `1px solid ${theme.colors.border[1]}`,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="transition-colors hover:bg-white/[0.02]"
                  style={{
                    borderBottom: i < filtered.length - 1 ? `1px solid ${theme.colors.border[1]}` : "none",
                  }}
                >
                  {COLUMNS.map((col) => {
                    const val = (item as any)[col.key];
                    const color = getCellColor(col.key, val);
                    return (
                      <td key={col.key} className="px-4 py-3 whitespace-nowrap" style={{ color }}>
                        {val !== null && val !== undefined ? (
                          col.key === "date" ? (
                            <span className="flex items-center gap-1.5">
                              {new Date(val as string).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              })}
                              {item.data_source === "google_fit" && <GoogleFitBadge size="xs" />}
                            </span>
                          ) : col.key === "notes" ? (
                            <span
                              className="italic truncate block max-w-[120px]"
                              style={{ color: theme.colors.text.subtle }}
                              title={String(val)}
                            >
                              {String(val)}
                            </span>
                          ) : (
                            String(val)
                          )
                        ) : (
                          <span style={{ color: theme.colors.text.subtle, opacity: 0.3 }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
