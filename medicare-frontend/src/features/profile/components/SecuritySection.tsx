import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useProfileStore } from "../store/profileStore";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useToast } from "@/store/toastStore";

export default function SecuritySection() {
  const { preferences, setPreference, markSaved } = useProfileStore();
  const { user } = useAuthStore();
  const toast = useToast();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handlePasswordChange = () => {
    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
      toast.warning("Please fill in all password fields");
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwordForm.newPass.length < 8) {
      toast.warning("Password must be at least 8 characters");
      return;
    }
    // In production, this would call the backend
    toast.success("Password updated successfully");
    setPasswordForm({ current: "", newPass: "", confirm: "" });
    setShowPasswordForm(false);
  };

  const handleToggle2FA = (value: boolean) => {
    setPreference("twoFactorAuth", value);
    markSaved();
    toast.info(value ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
  };

  const handleToggleBiometric = (value: boolean) => {
    setPreference("biometricLogin", value);
    markSaved();
    toast.info(value ? "Biometric login enabled" : "Biometric login disabled");
  };

  // Mock active sessions
  const sessions = [
    {
      id: "1",
      device: "Chrome on Windows",
      location: "Chennai, IN",
      lastActive: "Active now",
      isCurrent: true,
      icon: "fab fa-chrome",
    },
    {
      id: "2",
      device: "Safari on iPhone",
      location: "Chennai, IN",
      lastActive: "2 hours ago",
      isCurrent: false,
      icon: "fab fa-safari",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[1],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Header — compact */}
      <div
        className="flex items-center gap-2 px-3.5 py-3 sm:px-5 sm:py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
          style={{
            background: theme.colors.health.danger.bg,
            border: `1px solid ${theme.colors.health.danger.border}`,
          }}
        >
          <i className="fas fa-shield-halved text-[10px] sm:text-xs" style={{ color: theme.colors.health.danger.DEFAULT }} />
        </div>
        <div>
          <h3 className="font-bold text-xs sm:text-sm" style={{ color: theme.colors.text.primary }}>
            Account Security
          </h3>
          <p className="text-[9px] sm:text-[10px] hidden sm:block" style={{ color: theme.colors.text.subtle }}>
            Password, 2FA, and active sessions
          </p>
        </div>
      </div>

      <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-5">
        {/* Password Section — compact */}
        <div
          className="rounded-lg sm:rounded-xl p-3 sm:p-4"
          style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-key text-[10px] sm:text-xs" style={{ color: theme.colors.text.muted }} />
              <div>
                <div className="font-semibold text-xs sm:text-sm" style={{ color: theme.colors.text.primary }}>
                  Password
                </div>
                <div className="text-[9px] sm:text-[11px]" style={{ color: theme.colors.text.subtle }}>
                  Last changed: Never
                </div>
              </div>
            </div>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                style={{
                  background: theme.colors.surface[4],
                  color: theme.colors.text.muted,
                  border: `1px solid ${theme.colors.border[2]}`,
                  minHeight: "32px",
                }}
              >
                Change
              </button>
            )}
          </div>

          <AnimatePresence>
            {showPasswordForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2.5 sm:space-y-3">
                  {/* Current Password */}
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                      placeholder="Current password"
                      className="w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 pr-9 text-xs sm:text-sm outline-none transition-all placeholder:text-white/20"
                      style={{
                        background: theme.colors.surface[3],
                        border: `1px solid ${theme.colors.border[2]}`,
                        color: theme.colors.text.secondary,
                        fontFamily: theme.typography.fonts.primary,
                      }}
                    />
                    <button
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: theme.colors.text.subtle }}
                    >
                      <i className={`fas ${showCurrent ? "fa-eye-slash" : "fa-eye"} text-[10px] sm:text-xs`} />
                    </button>
                  </div>

                  {/* New Password */}
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, newPass: e.target.value }))}
                      placeholder="New password"
                      className="w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 pr-9 text-xs sm:text-sm outline-none transition-all placeholder:text-white/20"
                      style={{
                        background: theme.colors.surface[3],
                        border: `1px solid ${theme.colors.border[2]}`,
                        color: theme.colors.text.secondary,
                        fontFamily: theme.typography.fonts.primary,
                      }}
                    />
                    <button
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: theme.colors.text.subtle }}
                    >
                      <i className={`fas ${showNew ? "fa-eye-slash" : "fa-eye"} text-[10px] sm:text-xs`} />
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {passwordForm.newPass && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => {
                        const strength = [
                          passwordForm.newPass.length >= 8,
                          /[A-Z]/.test(passwordForm.newPass),
                          /[0-9]/.test(passwordForm.newPass),
                          /[^A-Za-z0-9]/.test(passwordForm.newPass),
                        ].filter(Boolean).length;
                        const colors = [
                          theme.colors.health.danger.DEFAULT,
                          theme.colors.health.warning.DEFAULT,
                          theme.colors.health.strain.DEFAULT,
                          theme.colors.health.recovery.DEFAULT,
                        ];
                        return (
                          <div
                            key={level}
                            className="flex-1 h-1 rounded-full transition-all duration-300"
                            style={{
                              background: level <= strength ? colors[strength - 1] : theme.colors.surface[4],
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Confirm Password */}
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm outline-none transition-all placeholder:text-white/20"
                    style={{
                      background: theme.colors.surface[3],
                      border: `1px solid ${
                        passwordForm.confirm && passwordForm.newPass !== passwordForm.confirm
                          ? theme.colors.health.danger.border
                          : theme.colors.border[2]
                      }`,
                      color: theme.colors.text.secondary,
                      fontFamily: theme.typography.fonts.primary,
                    }}
                  />

                  <div className="flex gap-2 pt-0.5">
                    <button
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordForm({ current: "", newPass: "", confirm: "" });
                      }}
                      className="flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all active:scale-95"
                      style={{
                        background: theme.colors.surface[3],
                        color: theme.colors.text.subtle,
                        border: `1px solid ${theme.colors.border[2]}`,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasswordChange}
                      className="flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all active:scale-95"
                      style={{
                        background: theme.colors.accent.primary,
                        color: theme.colors.bg.primary,
                        boxShadow: theme.shadows.accent,
                      }}
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2FA + Biometric — always 2 cols */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Two-Factor Auth */}
          <div
            className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 flex items-center justify-between"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: preferences.twoFactorAuth
                    ? theme.colors.health.recovery.bg
                    : theme.colors.surface[3],
                  border: `1px solid ${
                    preferences.twoFactorAuth
                      ? theme.colors.health.recovery.border
                      : theme.colors.border[1]
                  }`,
                }}
              >
                <i
                  className="fas fa-mobile-screen text-[10px] sm:text-xs"
                  style={{
                    color: preferences.twoFactorAuth
                      ? theme.colors.health.recovery.DEFAULT
                      : theme.colors.text.subtle,
                  }}
                />
              </div>
              <div>
                <div className="font-semibold text-[10px] sm:text-xs" style={{ color: theme.colors.text.primary }}>
                  2FA
                </div>
                <div className="text-[8px] sm:text-[10px] hidden sm:block" style={{ color: theme.colors.text.subtle }}>
                  Extra security
                </div>
              </div>
            </div>
            <button
              onClick={() => handleToggle2FA(!preferences.twoFactorAuth)}
              className="relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-all duration-300 shrink-0"
              style={{
                background: preferences.twoFactorAuth
                  ? theme.colors.health.recovery.DEFAULT
                  : theme.colors.surface[4],
              }}
            >
              <motion.span
                className="inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full"
                style={{
                  background: preferences.twoFactorAuth
                    ? theme.colors.bg.primary
                    : theme.colors.text.subtle,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
                animate={{ x: preferences.twoFactorAuth ? (typeof window !== "undefined" && window.innerWidth < 640 ? 16 : 22) : (typeof window !== "undefined" && window.innerWidth < 640 ? 3 : 4) }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Biometric Login */}
          <div
            className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 flex items-center justify-between"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: preferences.biometricLogin
                    ? theme.colors.accent.subtle
                    : theme.colors.surface[3],
                  border: `1px solid ${
                    preferences.biometricLogin
                      ? theme.colors.accent.border
                      : theme.colors.border[1]
                  }`,
                }}
              >
                <i
                  className="fas fa-fingerprint text-[10px] sm:text-xs"
                  style={{
                    color: preferences.biometricLogin
                      ? theme.colors.accent.primary
                      : theme.colors.text.subtle,
                  }}
                />
              </div>
              <div>
                <div className="font-semibold text-[10px] sm:text-xs" style={{ color: theme.colors.text.primary }}>
                  Biometric
                </div>
                <div className="text-[8px] sm:text-[10px] hidden sm:block" style={{ color: theme.colors.text.subtle }}>
                  Fingerprint / face
                </div>
              </div>
            </div>
            <button
              onClick={() => handleToggleBiometric(!preferences.biometricLogin)}
              className="relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-all duration-300 shrink-0"
              style={{
                background: preferences.biometricLogin
                  ? theme.colors.accent.primary
                  : theme.colors.surface[4],
              }}
            >
              <motion.span
                className="inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full"
                style={{
                  background: preferences.biometricLogin
                    ? theme.colors.bg.primary
                    : theme.colors.text.subtle,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
                animate={{ x: preferences.biometricLogin ? (typeof window !== "undefined" && window.innerWidth < 640 ? 16 : 22) : (typeof window !== "undefined" && window.innerWidth < 640 ? 3 : 4) }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Active Sessions — compact */}
        <div>
          <div
            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-2 sm:mb-3 flex items-center gap-2"
            style={{ color: theme.colors.text.subtle }}
          >
            <i className="fas fa-desktop opacity-60" />
            Active Sessions
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl"
                style={{
                  background: session.isCurrent ? theme.colors.accent.subtle : theme.colors.surface[2],
                  border: `1px solid ${session.isCurrent ? theme.colors.accent.border : theme.colors.border[1]}`,
                }}
              >
                <i className={`${session.icon} text-xs sm:text-sm`} style={{ color: theme.colors.text.muted }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[10px] sm:text-xs truncate" style={{ color: theme.colors.text.primary }}>
                    {session.device}
                    {session.isCurrent && (
                      <span
                        className="ml-1.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold"
                        style={{
                          background: theme.colors.accent.primary,
                          color: theme.colors.bg.primary,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] sm:text-[10px] mt-0.5" style={{ color: theme.colors.text.subtle }}>
                    {session.location} · {session.lastActive}
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => toast.info("Session revoked")}
                    className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                    style={{
                      color: theme.colors.health.danger.DEFAULT,
                      background: theme.colors.health.danger.bg,
                      border: `1px solid ${theme.colors.health.danger.border}`,
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { SecuritySection };
