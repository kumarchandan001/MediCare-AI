import { useRef } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";

interface CategoryPillsProps {
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
  counts?: Record<string, number>;
  selectedCounts?: Record<string, number>;
}

// Category icons mapping
const CAT_ICONS: Record<string, string> = {
  All:                 "fa-star",
  "Fever & Infection": "fa-temperature-high",
  Pain:                "fa-head-side-virus",
  Respiratory:         "fa-lungs",
  Digestive:           "fa-stomach",
  "Skin & Nails":      "fa-hand-dots",
  Neurological:        "fa-brain",
  "Eyes & Vision":     "fa-eye",
  "Liver & Jaundice":  "fa-vial",
  "Risk Factors":      "fa-triangle-exclamation",
  Other:               "fa-ellipsis",
};

export function CategoryPills({
  categories,
  active,
  onSelect,
  counts = {},
  selectedCounts = {},
}: CategoryPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto"
      style={{
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        borderBottom: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {categories.map((cat, i) => {
        const isActive  = cat === active;
        const isAll     = cat === "All";
        const selCount  = selectedCounts[cat] ?? 0;
        const total     = counts[cat] ?? 0;
        const icon      = CAT_ICONS[cat] ?? "fa-circle-dot";

        return (
          <motion.button
            key={cat}
            onClick={() => onSelect(cat)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-full transition-all"
            style={{
              fontFamily: theme.typography.fonts.primary,
              padding: "4px 12px 4px 8px",
              fontSize: "0.68rem",
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
              background: isActive
                ? theme.colors.accent.primary
                : theme.colors.surface[3],
              color: isActive
                ? theme.colors.bg.primary
                : theme.colors.text.muted,
              border: isActive
                ? `1px solid ${theme.colors.accent.primary}`
                : `1px solid ${theme.colors.border[2]}`,
              boxShadow: isActive
                ? `0 0 10px rgba(0,245,200,0.28)`
                : "none",
              whiteSpace: "nowrap",
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            <i
              className={`fas ${icon}`}
              style={{ fontSize: "0.58rem", opacity: isActive ? 1 : 0.6 }}
            />
            <span>{cat === "All" ? "General" : cat}</span>

            {/* Selected badge */}
            {selCount > 0 && (
              <span
                className="rounded-full font-bold"
                style={{
                  fontSize: "0.5rem",
                  padding: "1px 5px",
                  background: isActive
                    ? "rgba(0,0,0,0.2)"
                    : theme.colors.accent.primary,
                  color: isActive ? "#fff" : theme.colors.bg.primary,
                  minWidth: "14px",
                  textAlign: "center",
                }}
              >
                {selCount}
              </span>
            )}

            {/* Total count — only when not selected and not "All" */}
            {!isAll && selCount === 0 && total > 0 && (
              <span
                style={{
                  fontSize: "0.5rem",
                  color: isActive
                    ? "rgba(0,0,0,0.4)"
                    : theme.colors.text.subtle,
                }}
              >
                {total}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
