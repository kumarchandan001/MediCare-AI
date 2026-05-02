import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

interface SymptomGridProps {
  symptoms: string[];
  selected: string[];
  onToggle: (sym: string) => void;
  isLoading: boolean;
  categories?: Record<string, string[]>;
  activeCategory?: string;
}

// Curated common symptoms shown in the "General" (All) tab
const COMMON_SYMPTOMS = [
  "high_fever",
  "mild_fever",
  "headache",
  "fatigue",
  "cough",
  "breathlessness",
  "vomiting",
  "nausea",
  "chills",
  "sweating",
  "body_pain",
  "chest_pain",
  "back_pain",
  "joint_pain",
  "stomach_pain",
  "runny_nose",
  "sore_throat",
  "diarrhoea",
  "loss_of_appetite",
  "yellowish_skin",
];

function fmt(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Pill({
  sym,
  isSelected,
  onToggle,
}: {
  sym: string;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.1 }}
      onClick={onToggle}
      className="inline-flex items-center gap-1 rounded-lg font-medium transition-all"
      style={{
        fontSize: "0.68rem",
        fontFamily: theme.typography.fonts.primary,
        padding: "4px 11px",
        background: isSelected ? "rgba(0,245,200,0.12)" : theme.colors.surface[4],
        border: `1px solid ${isSelected ? "rgba(0,245,200,0.30)" : theme.colors.border[2]}`,
        color: isSelected ? theme.colors.accent.primary : theme.colors.text.muted,
        boxShadow: isSelected ? "0 0 8px rgba(0,245,200,0.1)" : "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
    >
      {isSelected && <i className="fas fa-check" style={{ fontSize: "0.45rem" }} />}
      {fmt(sym)}
    </motion.button>
  );
}

// Section with horizontal scrollable pill row
function Section({
  name,
  symptoms,
  selected,
  onToggle,
  defaultOpen,
}: {
  name: string;
  symptoms: string[];
  selected: string[];
  onToggle: (s: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const selCount = symptoms.filter((s) => selected.includes(s)).length;

  return (
    <div style={{ marginBottom: "2px" }}>
      {/* Section header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-1 py-1.5"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <span
          style={{
            fontSize: "0.58rem",
            color: theme.colors.text.subtle,
            fontWeight: 700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          {name}
        </span>
        {selCount > 0 && (
          <span
            style={{
              fontSize: "0.5rem",
              padding: "1px 5px",
              borderRadius: "999px",
              background: theme.colors.accent.primary,
              color: theme.colors.bg.primary,
              fontWeight: 700,
            }}
          >
            {selCount}
          </span>
        )}
        <span
          style={{
            fontSize: "0.5rem",
            color: theme.colors.text.subtle,
            marginLeft: "auto",
            opacity: 0.6,
          }}
        >
          {symptoms.length}
        </span>
        <i
          className={`fas fa-chevron-${open ? "up" : "down"}`}
          style={{ fontSize: "0.45rem", color: theme.colors.text.subtle }}
        />
      </button>

      {/* Horizontally scrollable pill row */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="flex gap-1.5 pb-3"
              style={{
                overflowX: "auto",
                scrollbarWidth: "none",
                paddingBottom: "10px",
                paddingTop: "2px",
                borderBottom: `1px solid ${theme.colors.border[1]}`,
                marginBottom: "2px",
              }}
            >
              {symptoms.map((sym) => (
                <Pill
                  key={sym}
                  sym={sym}
                  isSelected={selected.includes(sym)}
                  onToggle={() => onToggle(sym)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SymptomGrid({
  symptoms,
  selected,
  onToggle,
  isLoading,
  categories,
  activeCategory = "All",
}: SymptomGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {[3, 5, 4].map((count, si) => (
          <div key={si}>
            <div
              className="h-3 rounded mb-2 animate-pulse"
              style={{ width: "80px", background: theme.colors.surface[3] }}
            />
            <div className="flex gap-1.5">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className="h-7 rounded-lg animate-pulse flex-shrink-0"
                  style={{ width: `${56 + (i % 3) * 18}px`, background: theme.colors.surface[3] }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!symptoms.length) {
    return (
      <div className="flex flex-col items-center justify-center h-28 gap-2">
        <i
          className="fas fa-magnifying-glass"
          style={{ color: theme.colors.text.subtle, fontSize: "1.1rem" }}
        />
        <p style={{ fontSize: "0.72rem", color: theme.colors.text.subtle }}>
          No symptoms found
        </p>
      </div>
    );
  }

  // "General" tab — flat curated list of the most common symptoms
  if (activeCategory === "All") {
    const commonVisible = COMMON_SYMPTOMS.filter((s) => symptoms.includes(s));
    const toShow = commonVisible.length > 0 ? commonVisible : symptoms.slice(0, 20);
    return (
      <div className="py-2">
        <div
          className="flex flex-wrap gap-1.5"
          style={{ scrollbarWidth: "none" }}
        >
          <AnimatePresence mode="popLayout">
            {toShow.map((sym) => (
              <Pill
                key={sym}
                sym={sym}
                isSelected={selected.includes(sym)}
                onToggle={() => onToggle(sym)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Single category view — horizontal scrollable flat row
  return (
    <div
      className="flex gap-1.5 py-2"
      style={{
        overflowX: "auto",
        scrollbarWidth: "none",
        flexWrap: "wrap",
      }}
    >
      <AnimatePresence mode="popLayout">
        {symptoms.map((sym) => (
          <Pill
            key={sym}
            sym={sym}
            isSelected={selected.includes(sym)}
            onToggle={() => onToggle(sym)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
