import { useLocation, Link } from "react-router-dom";
import { theme } from "@/config/theme";
import { ROUTES } from "@/config/constants";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useAppStore } from "@/store/appStore";

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
}

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  [ROUTES.DASHBOARD]: { title: "Dashboard", sub: "Health Intelligence" },
  [ROUTES.HEALTH]: { title: "Health", sub: "Track & Monitor" },
  [ROUTES.PREDICTION]: { title: "Prediction", sub: "AI Disease Analysis" },
  [ROUTES.AI_ASSISTANT]: { title: "Karuna AI", sub: "Health Assistant" },
  [ROUTES.REPORTS]: { title: "Reports", sub: "Analytics & Trends" },
  [ROUTES.EMERGENCY]: { title: "Emergency", sub: "SOS & Contacts" },
  [ROUTES.PROFILE]: { title: "Profile", sub: "Account Settings" },
};

export function Topbar({ onMenuToggle, sidebarOpen }: TopbarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const { isOnline } = useAppStore();
  const pageInfo = PAGE_TITLES[location.pathname] || { title: "MediCare AI", sub: "" };

  return (
    <header
      className="flex items-center gap-3 sticky z-20 px-4 sm:px-5"
      style={{
        height: "60px",
        background: "rgba(8,12,11,0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${theme.colors.border[1]}`,
        top: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden flex items-center justify-center rounded-xl transition-colors flex-shrink-0"
        style={{
          width: "40px", height: "40px",
          background: sidebarOpen ? theme.colors.accent.subtle : "transparent",
          color: sidebarOpen ? theme.colors.accent.primary : theme.colors.text.muted,
          border: sidebarOpen ? `1px solid ${theme.colors.accent.border}` : `1px solid transparent`,
        }}
        aria-label="Toggle menu"
      >
        <i className={`fas fa-${sidebarOpen ? "xmark" : "bars"} text-sm`} />
      </button>

      {/* Logo — mobile only */}
      <div className="flex items-center gap-2 lg:hidden flex-shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: theme.colors.accent.primary, boxShadow: theme.shadows.accent }}
        >
          <i className="fas fa-heart-pulse" style={{ color: theme.colors.bg.primary, fontSize: "0.7rem" }} />
        </div>
      </div>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="font-black truncate tracking-tight"
            style={{ fontSize: "1rem", color: theme.colors.text.primary, letterSpacing: "-0.02em" }}
          >
            {pageInfo.title}
          </div>
          {!isOnline && (
            <span
              className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
              style={{
                fontSize: "0.6rem",
                background: theme.colors.health.warning.bg,
                color: theme.colors.health.warning.DEFAULT,
                border: `1px solid ${theme.colors.health.warning.border}`,
              }}
            >
              Offline
            </span>
          )}
        </div>
        {pageInfo.sub && (
          <div
            className="font-bold uppercase tracking-widest hidden sm:block"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
          >
            {pageInfo.sub}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={ROUTES.EMERGENCY}
          className="flex items-center justify-center rounded-xl relative transition-colors"
          style={{
            width: "40px", height: "40px",
            background: "transparent",
            color: theme.colors.text.muted,
          }}
        >
          <i className="fas fa-bell text-sm" />
        </Link>
        <Link
          to={ROUTES.PROFILE}
          className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
          style={{
            width: "36px", height: "36px",
            background: theme.colors.accent.subtle,
            border: `1px solid ${theme.colors.accent.border}`,
            color: theme.colors.accent.primary,
            fontSize: theme.typography.sizes.xs,
            textDecoration: "none",
          }}
        >
          {(user?.username?.[0] || "U").toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
