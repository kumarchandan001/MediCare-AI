import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "@/config/constants";
import { theme } from "@/config/theme";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";

type LoginMode = "password" | "otp";

export default function LoginPage() {
  const { login, loginDirect, isLoggingIn, isLoggingInDirect } = useAuth();
  const [mode, setMode] = useState<LoginMode>("password");
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);

  const isLoading = mode === "password" ? isLoggingInDirect : isLoggingIn;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "password") {
      loginDirect({ email: form.email, password: form.password });
    } else {
      login({ email: form.email, password: form.password });
    }
  };

  const inputBase: React.CSSProperties = {
    background: theme.colors.surface[3],
    border: `1.5px solid ${theme.colors.border[2]}`,
    color: theme.colors.text.primary,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.primary,
    transition: "all 0.2s ease",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = theme.colors.border.focus;
    e.target.style.boxShadow = `0 0 0 3px ${theme.colors.accent.subtle}`;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = theme.colors.border[2];
    e.target.style.boxShadow = "none";
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "10px 0",
    borderRadius: "12px",
    fontSize: theme.typography.sizes.sm,
    fontWeight: 600,
    fontFamily: theme.typography.fonts.primary,
    cursor: "pointer",
    border: "none",
    transition: "all 0.25s ease",
    background: active ? theme.colors.accent.primary : "transparent",
    color: active ? theme.colors.bg.primary : theme.colors.text.muted,
    boxShadow: active ? theme.shadows.accent : "none",
  });

  return (
    <div
      style={{ background: theme.colors.bg.primary }}
      className="min-h-screen flex"
    >
      {/* ─── Left Brand Panel ─────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between px-14 py-14 w-[480px] flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${theme.colors.surface[2]} 0%, ${theme.colors.bg.primary} 100%)`,
          borderRight: `1px solid ${theme.colors.border[1]}`,
        }}
      >
        {/* Decorative orbs */}
        <div
          className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${theme.colors.accent.glow}, transparent 65%)`,
          }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${theme.colors.health.strain.glow}, transparent 65%)`,
          }}
        />

        {/* Top logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: theme.colors.accent.primary,
                boxShadow: theme.shadows.accent,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.bg.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <div>
              <h1
                className="font-black text-lg tracking-tight leading-tight"
                style={{ color: theme.colors.text.primary }}
              >
                MediCare AI
              </h1>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: theme.colors.text.subtle }}
              >
                Health Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Center hero text */}
        <div className="relative z-10 -mt-8">
          <h2
            className="font-black leading-[1.1] tracking-tight mb-5"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3rem)",
              color: theme.colors.text.primary,
            }}
          >
            Your health,{" "}
            <span
              style={{
                color: theme.colors.accent.primary,
                textShadow: `0 0 40px ${theme.colors.accent.glow}`,
              }}
            >
              secured
            </span>
          </h2>
          <p
            className="leading-relaxed"
            style={{
              color: theme.colors.text.muted,
              fontSize: theme.typography.sizes.base,
              maxWidth: "340px",
            }}
          >
            Sign in with your password for instant access, or use OTP verification for an extra layer of security.
          </p>
        </div>

        {/* Bottom feature pills */}
        <div className="relative z-10 flex flex-wrap gap-2">
          {["Password Login", "OTP Verification", "Brute-force Protection", "JWT Auth"].map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={{
                background: theme.colors.surface[4],
                color: theme.colors.text.muted,
                border: `1px solid ${theme.colors.border[2]}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: theme.colors.accent.primary }}
              />
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Right Form Panel ─────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{
                background: theme.colors.accent.primary,
                boxShadow: theme.shadows.accent,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.bg.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <h1 className="font-black text-lg" style={{ color: theme.colors.text.primary }}>
              MediCare AI
            </h1>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2
              className="font-black tracking-tight mb-2"
              style={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.sizes.h1,
              }}
            >
              Welcome back
            </h2>
            <p style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.sm }}>
              Don't have an account?{" "}
              <Link
                to={ROUTES.SIGNUP}
                className="font-semibold hover:underline"
                style={{ color: theme.colors.accent.primary }}
              >
                Sign up →
              </Link>
            </p>
          </div>

          {/* ── Mode Tabs ──────────────────────── */}
          <div
            className="flex gap-1 p-1 rounded-[14px] mb-7"
            style={{ background: theme.colors.surface[3] }}
          >
            <button
              type="button"
              id="login-tab-password"
              style={tabStyle(mode === "password")}
              onClick={() => setMode("password")}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Password
              </span>
            </button>
            <button
              type="button"
              id="login-tab-otp"
              style={tabStyle(mode === "otp")}
              onClick={() => setMode("otp")}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                Email OTP
              </span>
            </button>
          </div>

          {/* ── Form ───────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                className="block mb-2 font-bold uppercase tracking-widest"
                style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xxs }}
              >
                Email Address
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  type="email"
                  id="login-email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all"
                  style={inputBase}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            {/* Password — only for password mode */}
            {mode === "password" && (
              <div
                style={{
                  animation: "fadeSlideIn 0.3s ease forwards",
                }}
              >
                <div className="flex justify-between mb-2">
                  <label
                    className="font-bold uppercase tracking-widest"
                    style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xxs }}
                  >
                    Password
                  </label>
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className="font-medium hover:underline"
                    style={{ color: theme.colors.accent.primary, fontSize: theme.typography.sizes.xs }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type={showPw ? "text" : "password"}
                    id="login-password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl outline-none transition-all"
                    style={inputBase}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-80"
                    style={{ color: theme.colors.text.subtle }}
                  >
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* OTP info card — only for OTP mode */}
            {mode === "otp" && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  background: theme.colors.accent.subtle,
                  border: `1px solid ${theme.colors.accent.border}`,
                  animation: "fadeSlideIn 0.3s ease forwards",
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                <div>
                  <p
                    className="font-semibold mb-0.5"
                    style={{ color: theme.colors.accent.primary, fontSize: theme.typography.sizes.sm }}
                  >
                    Passwordless login
                  </p>
                  <p style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.xs }}>
                    We'll send a one-time verification code to your email. No password needed.
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
              style={{
                background: theme.colors.accent.primary,
                color: theme.colors.bg.primary,
                fontSize: theme.typography.sizes.base,
                boxShadow: theme.shadows.accent,
                fontFamily: theme.typography.fonts.primary,
              }}
            >
              {isLoading ? (
                <SpinnerLoader size="sm" />
              ) : mode === "password" ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign In
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  Send OTP
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: theme.colors.border[2] }} />
            <span style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xxs }} className="font-bold uppercase tracking-widest">
              {mode === "password" ? "Prefer OTP?" : "Have a password?"}
            </span>
            <div className="flex-1 h-px" style={{ background: theme.colors.border[2] }} />
          </div>

          {/* Alt mode button */}
          <button
            type="button"
            onClick={() => setMode(mode === "password" ? "otp" : "password")}
            className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110"
            style={{
              background: theme.colors.surface[3],
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm,
              border: `1px solid ${theme.colors.border[2]}`,
              fontFamily: theme.typography.fonts.primary,
            }}
          >
            {mode === "password" ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                Login with Email OTP instead
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Login with Password instead
              </>
            )}
          </button>

          {/* Footer */}
          <p
            className="text-center mt-6"
            style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xs }}
          >
            🔒 Protected by OTP 2FA + brute-force detection
          </p>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
