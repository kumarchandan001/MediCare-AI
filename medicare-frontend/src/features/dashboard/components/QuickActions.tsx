import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { theme } from "@/config/theme";
import { ROUTES } from "@/config/constants";

const ACTIONS = [
  {
    title: "Log Vitals",
    desc: "Record today's health data",
    icon: "fa-heart-pulse",
    color: theme.colors.health.strain.DEFAULT,
    to: ROUTES.HEALTH,
  },
  {
    title: "Check Symptoms",
    desc: "AI disease prediction",
    icon: "fa-stethoscope",
    color: theme.colors.accent.primary,
    to: ROUTES.PREDICTION,
  },
  {
    title: "Ask AI",
    desc: "Chat with health assistant",
    icon: "fa-robot",
    color: theme.colors.health.sleep.DEFAULT,
    to: ROUTES.AI_ASSISTANT,
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {ACTIONS.map((action, i) => (
        <motion.div
          key={action.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.08 }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.97 }}
        >
          <Link
            to={action.to}
            className="flex flex-col items-center text-center gap-3 p-5 rounded-xl transition-colors"
            style={{
              background: theme.colors.surface[2],
              border: `1px solid ${theme.colors.border[1]}`,
              textDecoration: "none",
              display: "block",
            }}
          >
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
              style={{
                background: `${action.color}12`,
                border: `1px solid ${action.color}25`,
              }}
              whileHover={{ rotate: -4, scale: 1.1 }}
            >
              <i
                className={`fas ${action.icon} text-lg`}
                style={{ color: action.color }}
              />
            </motion.div>
            <div>
              <div
                className="font-bold uppercase tracking-wider mb-1"
                style={{
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.primary,
                }}
              >
                {action.title}
              </div>
              <div
                style={{
                  fontSize: theme.typography.sizes.xxs,
                  color: theme.colors.text.subtle,
                }}
              >
                {action.desc}
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
