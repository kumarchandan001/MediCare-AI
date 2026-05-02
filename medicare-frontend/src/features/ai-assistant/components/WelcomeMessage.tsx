import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useAuthStore } from "@/features/auth/store/authStore";

interface WelcomeMessageProps {
  onSuggestion: (q: string) => void;
  suggestions: string[];
}

const STARTER_QUESTIONS = [
  "What does my latest health data say?",
  "How can I improve my overall health?",
  "What are signs I should see a doctor?",
];

export function WelcomeMessage({
  onSuggestion,
  suggestions,
}: WelcomeMessageProps) {
  const { user } = useAuthStore();
  const name = user?.first_name || user?.username || "there";

  const questions =
    suggestions.length > 0 ? suggestions.slice(0, 3) : STARTER_QUESTIONS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center px-8 py-10"
    >
      {/* AI Avatar large */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: theme.colors.accent.subtle,
          border: `2px solid ${theme.colors.accent.border}`,
          boxShadow: theme.shadows.accent,
        }}
      >
        <i
          className="fas fa-robot text-3xl"
          style={{ color: theme.colors.accent.primary }}
        />
      </motion.div>

      {/* Greeting */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="font-black tracking-tight mb-2"
        style={{
          fontSize: theme.typography.sizes.h2,
          color: theme.colors.text.primary,
          letterSpacing: "-0.02em",
        }}
      >
        Hi {name}! I'm Karuna 👋
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="leading-relaxed mb-8 max-w-xs"
        style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.text.muted,
        }}
      >
        Your personal AI health assistant. I know your health data and can
        answer questions, explain your metrics, and guide you toward better
        health.
      </motion.p>

      {/* Quick start questions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-2"
      >
        <p
          className="font-bold uppercase tracking-widest mb-3"
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: theme.colors.text.subtle,
          }}
        >
          Try asking
        </p>
        {questions.map((q, i) => (
          <motion.button
            key={q}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.07 }}
            onClick={() => onSuggestion(q)}
            className="w-full text-left px-4 py-3 rounded-xl font-medium transition-all"
            style={{
              background: theme.colors.surface[3],
              border: `1px solid ${theme.colors.border[2]}`,
              color: theme.colors.text.muted,
              fontSize: theme.typography.sizes.sm,
              fontFamily: theme.typography.fonts.primary,
            }}
            whileHover={{
              borderColor: theme.colors.accent.border,
              color: theme.colors.accent.primary,
              x: 4,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <i
              className="fas fa-chevron-right text-xs mr-2"
              style={{
                color: theme.colors.accent.primary,
                opacity: 0.5,
              }}
            />
            {q}
          </motion.button>
        ))}
      </motion.div>

      {/* Disclaimer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 max-w-xs"
        style={{
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.text.subtle,
          fontStyle: "italic",
          lineHeight: 1.6,
        }}
      >
        ⚕️ I provide health information only. Always consult a qualified doctor
        for medical advice, diagnosis, or treatment.
      </motion.p>
    </motion.div>
  );
}
