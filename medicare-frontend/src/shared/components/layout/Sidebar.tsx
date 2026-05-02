import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/constants";
import { theme } from "@/config/theme";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/features/auth/store/authStore";

const navItems = [
  { path: ROUTES.DASHBOARD, icon: "fas fa-chart-line", label: "Dashboard" },
  { path: ROUTES.HEALTH, icon: "fas fa-heart-pulse", label: "Health" },
  { path: ROUTES.PREDICTION, icon: "fas fa-brain", label: "Prediction" },
  { path: ROUTES.AI_ASSISTANT, icon: "fas fa-robot", label: "AI Assistant" },
  { path: ROUTES.REPORTS, icon: "fas fa-chart-bar", label: "Reports" },
  { path: ROUTES.EMERGENCY, icon: "fas fa-triangle-exclamation", label: "Emergency", isDanger: true },
  { path: ROUTES.PROFILE, icon: "fas fa-user", label: "Profile" },
];

interface SidebarProps {
  isMobileDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export function Sidebar({ isMobileDrawer, onCloseDrawer }: SidebarProps) {
  const { sidebarCollapsed, collapseSidebar } = useAppStore();
  const { isAdmin } = useAuthStore();
  const location = useLocation();

  // Mobile drawer is never collapsed
  const collapsed = isMobileDrawer ? false : sidebarCollapsed;

  return (
    <aside
      className={cn(
        "h-screen flex flex-col z-40 transition-all duration-300",
        isMobileDrawer ? "w-[260px]" : "fixed left-0 top-0 hidden lg:flex",
        !isMobileDrawer && (collapsed ? "w-[68px]" : "w-[260px]")
      )}
      style={{
        background: theme.colors.surface[1],
        borderRight: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Logo */}
      <div
        className="h-[60px] flex items-center px-5"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: theme.colors.accent.primary, boxShadow: theme.shadows.accent }}
        >
          <i className="fas fa-heart-pulse text-sm" style={{ color: theme.colors.bg.primary }} />
        </div>
        {!collapsed && (
          <span
            className="ml-3 font-black text-base tracking-tight"
            style={{ color: theme.colors.text.primary }}
          >
            MediCare AI
          </span>
        )}

        {/* Mobile close button */}
        {isMobileDrawer && onCloseDrawer && (
          <button
            onClick={onCloseDrawer}
            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: theme.colors.text.subtle }}
          >
            <i className="fas fa-xmark" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isDanger = "isDanger" in item && item.isDanger;

          const activeStyles = isDanger
            ? {
                background: theme.colors.health.danger.bg,
                color: theme.colors.health.danger.DEFAULT,
                border: `1px solid ${theme.colors.health.danger.border}`,
              }
            : {
                background: theme.colors.accent.subtle,
                color: theme.colors.accent.primary,
                border: `1px solid ${theme.colors.accent.border}`,
              };

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={
                isActive
                  ? activeStyles
                  : {
                      color: theme.colors.text.subtle,
                      border: "1px solid transparent",
                    }
              }
              onClick={isMobileDrawer ? onCloseDrawer : undefined}
            >
              <i className={cn(item.icon, "w-5 text-center text-[0.9rem]")} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* Admin Panel link (admins only) */}
        {isAdmin() && (
          <>
            <div className="my-2" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }} />
            <NavLink
              to={ROUTES.ADMIN}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={
                location.pathname.startsWith(ROUTES.ADMIN)
                  ? {
                      background: theme.colors.health.warning.bg,
                      color: theme.colors.health.warning.DEFAULT,
                      border: `1px solid ${theme.colors.health.warning.border}`,
                    }
                  : {
                      color: theme.colors.health.warning.DEFAULT,
                      border: "1px solid transparent",
                    }
              }
              onClick={isMobileDrawer ? onCloseDrawer : undefined}
            >
              <i className={cn("fas fa-shield-halved", "w-5 text-center text-[0.9rem]")} />
              {!collapsed && <span>Admin Panel</span>}
            </NavLink>
          </>
        )}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!isMobileDrawer && (
        <div className="p-3" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
          <button
            onClick={collapseSidebar}
            className="w-full flex items-center justify-center py-2 rounded-lg transition-all"
            style={{ color: theme.colors.text.subtle }}
          >
            <i className={cn("fas", collapsed ? "fa-chevron-right" : "fa-chevron-left", "text-xs")} />
          </button>
        </div>
      )}
    </aside>
  );
}
