import { motion } from "framer-motion";
import { theme } from "@/config/theme";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-3"
    >
      {/* AI Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
        style={{
          background: theme.colors.accent.subtle,
          border: `1px solid ${theme.colors.accent.border}`,
          color: theme.colors.accent.primary,
        }}
      >
        <i className="fas fa-robot text-xs" />
      </div>

      {/* Typing dots */}
      <div
        className="flex items-center gap-1 px-4 py-3 rounded-2xl"
        style={{
          background: theme.colors.surface[3],
          border: `1px solid ${theme.colors.border[2]}`,
          borderBottomLeftRadius: "6px",
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block rounded-full"
            style={{
              width: "6px",
              height: "6px",
              background: theme.colors.text.subtle,
            }}
            animate={{
              y: [0, -5, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
