import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { theme } from "@/config/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROUTES } from "@/config/constants";

export default function LogoutConfirmation() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Small delay for visual feedback
    await new Promise((r) => setTimeout(r, 600));
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <>
      {/* Danger Zone Card — compact inline layout */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="rounded-2xl overflow-hidden"
        style={{
          background: theme.colors.surface[1],
          border: `1px solid ${theme.colors.health.danger.border}`,
        }}
      >
        {/* Always inline: icon + text + button */}
        <div className="flex items-center gap-2.5 sm:gap-4 p-3.5 sm:p-5">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: theme.colors.health.danger.bg,
              border: `1px solid ${theme.colors.health.danger.border}`,
            }}
          >
            <i className="fas fa-arrow-right-from-bracket text-xs sm:text-sm" style={{ color: theme.colors.health.danger.DEFAULT }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs sm:text-sm" style={{ color: theme.colors.text.primary }}>
              Sign Out
            </div>
            <p className="text-[10px] sm:text-[11px] mt-0.5 hidden sm:block" style={{ color: theme.colors.text.subtle }}>
              You'll need to sign in again to access your data.
            </p>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0"
            style={{
              fontSize: theme.typography.sizes.xxs,
              fontFamily: theme.typography.fonts.primary,
              background: theme.colors.health.danger.bg,
              color: theme.colors.health.danger.DEFAULT,
              border: `1px solid ${theme.colors.health.danger.border}`,
              minHeight: "36px",
            }}
          >
            <i className="fas fa-arrow-right-from-bracket text-[10px]" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConfirm(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: theme.colors.surface[1],
                border: `1px solid ${theme.colors.health.danger.border}`,
                boxShadow: `0 0 40px rgba(255,61,90,0.1), ${theme.shadows.card}`,
              }}
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 text-center">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4"
                  style={{
                    background: theme.colors.health.danger.bg,
                    border: `1px solid ${theme.colors.health.danger.border}`,
                  }}
                >
                  <i
                    className="fas fa-arrow-right-from-bracket text-lg sm:text-xl"
                    style={{ color: theme.colors.health.danger.DEFAULT }}
                  />
                </div>
                <h3
                  className="font-black text-base sm:text-lg mb-1.5"
                  style={{ color: theme.colors.text.primary }}
                >
                  Sign Out?
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.colors.text.muted }}>
                  Your health data will remain safe and synced.
                </p>
              </div>

              {/* Modal Actions */}
              <div
                className="flex gap-3 p-4 sm:p-5"
                style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}
              >
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isLoggingOut}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95"
                  style={{
                    background: theme.colors.surface[3],
                    color: theme.colors.text.muted,
                    border: `1px solid ${theme.colors.border[2]}`,
                    fontFamily: theme.typography.fonts.primary,
                  }}
                >
                  Stay
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background: theme.colors.health.danger.DEFAULT,
                    color: "#fff",
                    fontFamily: theme.typography.fonts.primary,
                    boxShadow: theme.shadows.red,
                    opacity: isLoggingOut ? 0.7 : 1,
                  }}
                >
                  {isLoggingOut ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <i className="fas fa-spinner text-xs sm:text-sm" />
                      </motion.div>
                      Signing Out...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-arrow-right-from-bracket text-xs sm:text-sm" />
                      Sign Out
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export { LogoutConfirmation };
