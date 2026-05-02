import { AnimatePresence, motion } from "framer-motion";
import { theme } from "@/config/theme";

interface SelectedSymptomsBarProps {
  selected: string[];
  onRemove: (sym: string) => void;
  onClear: () => void;
}

function formatSymptom(sym: string): string {
  return sym.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function SelectedSymptomsBar({
  selected,
  onRemove,
  onClear,
}: SelectedSymptomsBarProps) {
  const isEmpty = selected.length === 0;

  return (
    <div
      className="min-h-[52px] p-3 rounded-xl flex flex-wrap gap-2 items-center"
      style={{
        background: isEmpty
          ? theme.colors.surface[3]
          : theme.colors.accent.subtle,
        border: isEmpty
          ? `1.5px dashed ${theme.colors.border[2]}`
          : `1.5px solid ${theme.colors.accent.border}`,
        transition: "all 0.2s ease",
      }}
    >
      {isEmpty ? (
        <span
          style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.text.subtle,
          }}
        >
          Select symptoms above to begin analysis...
        </span>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            {selected.map((sym) => (
              <motion.span
                key={sym}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold"
                style={{
                  background: theme.colors.accent.primary,
                  color: theme.colors.bg.primary,
                  fontSize: theme.typography.sizes.xs,
                }}
              >
                {formatSymptom(sym)}
                <button
                  onClick={() => onRemove(sym)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                  style={{ fontSize: "0.6rem" }}
                >
                  <i className="fas fa-xmark" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>

          <button
            onClick={onClear}
            className="ml-auto text-xs font-semibold transition-opacity opacity-50 hover:opacity-100"
            style={{
              color: theme.colors.text.muted,
              fontFamily: theme.typography.fonts.primary,
            }}
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
}
