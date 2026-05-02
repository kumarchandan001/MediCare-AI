import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ROUTES } from "@/config/constants";

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, label: "Today", icon: "fa-chart-line", exact: true },
  { to: ROUTES.HEALTH, label: "Health", icon: "fa-heart-pulse" },
  { to: ROUTES.PREDICTION, label: "Predict", icon: "fa-stethoscope" },
  { to: ROUTES.AI_ASSISTANT, label: "AI", icon: "fa-robot" },
  { to: ROUTES.EMERGENCY, label: "SOS", icon: "fa-triangle-exclamation", isEmergency: true },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden"
      style={{
        background: "rgba(8,12,11,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${theme.colors.border[1]}`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch" style={{ height: "60px" }}>
        {NAV_ITEMS.map((item) => {
          const isExact = "exact" in item && item.exact;
          const isActive = isExact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          const isEmergency = "isEmergency" in item && item.isEmergency;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative active:opacity-70 transition-opacity"
              style={{ textDecoration: "none", touchAction: "manipulation" }}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: "24px", height: "2px",
                    background: isEmergency ? theme.colors.health.danger.DEFAULT : theme.colors.accent.primary,
                    borderRadius: "0 0 4px 4px",
                    boxShadow: isEmergency
                      ? `0 0 8px ${theme.colors.health.danger.DEFAULT}`
                      : theme.shadows.accent,
                  }}
                />
              )}
              <i
                className={`fas ${item.icon}`}
                style={{
                  fontSize: "1.1rem",
                  color: isActive
                    ? isEmergency ? theme.colors.health.danger.DEFAULT : theme.colors.accent.primary
                    : theme.colors.text.subtle,
                  transition: "color 0.2s",
                }}
              />
              <span
                className="font-bold uppercase tracking-wider"
                style={{
                  fontSize: "0.55rem",
                  color: isActive
                    ? isEmergency ? theme.colors.health.danger.DEFAULT : theme.colors.accent.primary
                    : theme.colors.text.subtle,
                  transition: "color 0.2s",
                }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
