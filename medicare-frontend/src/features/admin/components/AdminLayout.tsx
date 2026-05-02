import { Outlet, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROUTES } from "@/config/constants";

const ADMIN_NAV = [
  { to: ROUTES.ADMIN, label: "Overview", icon: "fa-chart-pie", exact: true },
  { to: ROUTES.ADMIN_USERS, label: "Users", icon: "fa-users", exact: false },
  { to: ROUTES.ADMIN_PREDICTIONS, label: "Predictions", icon: "fa-stethoscope", exact: false },
  { to: ROUTES.ADMIN_ALERTS, label: "Alerts", icon: "fa-bell", exact: false },
  { to: ROUTES.ADMIN_HEALTH, label: "Health Intel", icon: "fa-heart-pulse", exact: false },
  { to: ROUTES.ADMIN_AI, label: "AI Monitor", icon: "fa-robot", exact: false },
  { to: ROUTES.ADMIN_SYSTEM, label: "System", icon: "fa-server", exact: false },
  { to: ROUTES.ADMIN_AUDIT_LOG, label: "Audit Log", icon: "fa-shield-halved", exact: false },
  { to: ROUTES.ADMIN_SETTINGS, label: "Settings", icon: "fa-sliders", exact: false },
] as const;

export function AdminLayout() {
  const location = useLocation();
  const { isAuthenticated, isAdmin, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);

  if (!isAuthenticated()) return <Navigate to={ROUTES.LOGIN} replace />;
  if (!isAdmin()) return <Navigate to={ROUTES.DASHBOARD} replace />;

  const handleLogout = () => { logout(); navigate(ROUTES.LOGIN); };

  const renderNavItems = (onClick?: () => void) =>
    ADMIN_NAV.map((item) => {
      const isActive = item.exact
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to);
      return (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all"
          style={{
            fontSize: theme.typography.sizes.xxs,
            textDecoration: "none",
            background: isActive ? `${theme.colors.health.warning.DEFAULT}15` : "transparent",
            color: isActive ? theme.colors.health.warning.DEFAULT : theme.colors.text.subtle,
            border: isActive ? `1px solid ${theme.colors.health.warning.DEFAULT}25` : "1px solid transparent",
            minHeight: "44px",
          }}
        >
          <i className={`fas ${item.icon} text-sm`} />
          {item.label}
        </NavLink>
      );
    });

  return (
    <div className="flex min-h-screen" style={{ background: theme.colors.bg.primary }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[240px] flex-shrink-0"
        style={{
          background: theme.colors.surface[1],
          borderRight: `1px solid ${theme.colors.border[1]}`,
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100,
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: `1px solid ${theme.colors.border[1]}`, height: "60px" }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: theme.colors.health.warning.DEFAULT,
              boxShadow: `0 0 16px ${theme.colors.health.warning.DEFAULT}40`,
            }}
          >
            <i className="fas fa-shield-halved" style={{ color: theme.colors.bg.primary, fontSize: "0.85rem" }} />
          </div>
          <div>
            <div className="font-black leading-none" style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary, letterSpacing: "-0.02em" }}>
              Admin Panel
            </div>
            <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.health.warning.DEFAULT, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              MediCare AI
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {renderNavItems()}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 space-y-2" style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
          <NavLink
            to={ROUTES.DASHBOARD}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-colors w-full"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, background: "transparent", textDecoration: "none" }}
          >
            <i className="fas fa-arrow-left text-sm" />
            Back to App
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-colors w-full"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.health.danger.DEFAULT, background: "transparent", fontFamily: theme.typography.fonts.primary }}
          >
            <i className="fas fa-right-from-bracket text-sm" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[240px]">
        {/* Topbar */}
        <header
          className="sticky top-0 z-20 flex items-center gap-3 px-5 lg:px-6"
          style={{
            height: "60px", background: "rgba(8,12,11,0.9)", backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${theme.colors.border[1]}`,
          }}
        >
          <button
            onClick={() => setMobileNav((p) => !p)}
            className="lg:hidden flex items-center justify-center rounded-xl"
            style={{ width: "40px", height: "40px", background: theme.colors.surface[3], color: theme.colors.text.muted }}
          >
            <i className="fas fa-bars text-sm" />
          </button>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: `${theme.colors.health.warning.DEFAULT}10`, border: `1px solid ${theme.colors.health.warning.DEFAULT}25` }}
          >
            <i className="fas fa-shield-halved text-xs" style={{ color: theme.colors.health.warning.DEFAULT }} />
            <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.health.warning.DEFAULT }}>
              Admin Mode
            </span>
          </div>
          <div className="flex-1" />
          <NavLink
            to={ROUTES.DASHBOARD}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all"
            style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, background: theme.colors.surface[3], color: theme.colors.text.muted, textDecoration: "none", minHeight: "36px" }}
          >
            <i className="fas fa-arrow-left text-xs" />
            <span className="hidden sm:inline">Back to App</span>
          </NavLink>
        </header>

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.7)" }}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[240px] lg:hidden flex flex-col"
              style={{ background: theme.colors.surface[1], borderRight: `1px solid ${theme.colors.border[1]}` }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
                <span className="font-black" style={{ color: theme.colors.health.warning.DEFAULT, fontSize: theme.typography.sizes.base, letterSpacing: "-0.02em" }}>
                  Admin Panel
                </span>
                <button onClick={() => setMobileNav(false)} style={{ color: theme.colors.text.muted, minWidth: "32px", minHeight: "32px" }}>
                  <i className="fas fa-xmark" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {renderNavItems(() => setMobileNav(false))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminLayout;
