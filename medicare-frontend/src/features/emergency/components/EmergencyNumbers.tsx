import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { EMERGENCY_NUMBERS } from "../types/emergency.types";

const NUM_COLORS: Record<string, string> = {
  danger: theme.colors.health.danger.DEFAULT,
  orange: "#FF6D00",
  accent: theme.colors.accent.primary,
  purple: theme.colors.health.sleep.DEFAULT,
};

export function EmergencyNumbers() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.health.danger.DEFAULT }} />
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
          >
            Emergency Numbers
          </span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {EMERGENCY_NUMBERS.map((num, i) => {
          const color = NUM_COLORS[num.color];
          return (
            <motion.a
              key={num.number}
              href={`tel:${num.number}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center text-center p-4 rounded-xl active:scale-95 transition-transform"
              style={{
                background: `${color}10`,
                border: `1px solid ${color}25`,
                textDecoration: "none",
                minHeight: "80px",
                touchAction: "manipulation",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <i className={`fas ${num.icon} text-xl mb-2`} style={{ color }} />
              <span
                className="font-black leading-none mb-1"
                style={{ fontSize: theme.typography.sizes.h2, color, letterSpacing: "-0.04em" }}
              >
                {num.number.length > 6 ? num.number.split("-")[0] : num.number}
              </span>
              <span
                className="font-bold uppercase tracking-wider"
                style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.muted }}
              >
                {num.label}
              </span>
              <span style={{ fontSize: "0.55rem", color: theme.colors.text.subtle, marginTop: "2px" }}>
                {num.sublabel}
              </span>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
