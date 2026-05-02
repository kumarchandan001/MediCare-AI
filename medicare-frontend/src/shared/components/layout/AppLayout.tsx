import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROUTES } from "@/config/constants";
import { theme } from "@/config/theme";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BottomNav } from "./BottomNav";
import { DailyCheckinModal } from "@/shared/components/ui/DailyCheckinModal";

export function AppLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((p) => !p);
  }, []);

  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen" style={{ background: theme.colors.bg.primary }}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-[260px] flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[260px] lg:hidden"
            >
              <Sidebar isMobileDrawer onCloseDrawer={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className="flex-1 flex flex-col min-w-0 min-h-screen"
        style={{ paddingBottom: "calc(68px + env(safe-area-inset-bottom, 0px))" }}
      >
        <Topbar onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
        <div className="flex-1 p-4 sm:p-5 lg:p-6 max-w-[1440px] w-full mx-auto animate-page-in">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <BottomNav />

      {/* Daily Health Check-in Modal (shows if no data today) */}
      <DailyCheckinModal />
    </div>
  );
}
