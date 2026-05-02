import { motion } from "framer-motion";
import { theme } from "@/config/theme";

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (q: string) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export function SuggestedQuestions({
  questions,
  onSelect,
  isLoading,
  isDisabled,
}: SuggestedQuestionsProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 rounded-xl animate-pulse"
            style={{
              background: theme.colors.surface[3],
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <motion.button
          key={q}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          onClick={() => onSelect(q)}
          disabled={isDisabled}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
          style={{
            background: theme.colors.surface[3],
            border: `1px solid ${theme.colors.border[2]}`,
            color: theme.colors.text.muted,
            fontSize: theme.typography.sizes.sm,
            fontFamily: theme.typography.fonts.primary,
          }}
          whileHover={{
            x: 4,
            borderColor: theme.colors.accent.border,
            color: theme.colors.accent.primary,
          }}
          whileTap={{ scale: 0.98 }}
        >
          <i
            className="fas fa-chevron-right text-xs flex-shrink-0"
            style={{
              color: theme.colors.accent.primary,
              opacity: 0.5,
            }}
          />
          {q}
        </motion.button>
      ))}
    </div>
  );
}
