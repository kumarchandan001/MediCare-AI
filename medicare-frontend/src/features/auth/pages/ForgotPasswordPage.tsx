import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "@/config/constants";
import { theme } from "@/config/theme";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";

export default function ForgotPasswordPage() {
  const { forgotPassword, isSendingReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword({ email });
    setSent(true);
  };

  const inputStyle = {
    background: theme.colors.surface[3],
    border: `1.5px solid ${theme.colors.border[2]}`,
    color: theme.colors.text.primary,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.primary,
  };

  return (
    <div
      style={{ background: theme.colors.bg.primary }}
      className="min-h-screen flex items-center justify-center px-4 py-12"
    >
      <div
        className="w-full max-w-[440px] rounded-2xl p-8"
        style={{
          background: theme.colors.surface[2],
          border: `1px solid ${theme.colors.border[2]}`,
        }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: theme.colors.health.warning.bg,
            border: `1px solid ${theme.colors.health.warning.border}`,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.health.warning.DEFAULT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2
          className="text-center font-black tracking-tight mb-2"
          style={{ color: theme.colors.text.primary, fontSize: theme.typography.sizes.h1 }}
        >
          Forgot password?
        </h2>
        <p className="text-center mb-8" style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.sm }}>
          Enter your email and we'll send you an OTP to reset your password.
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block mb-2 font-bold uppercase tracking-widest"
                style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xxs }}
              >
                Email Address
              </label>
              <input
                type="email"
                id="forgot-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.border.focus;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.colors.accent.subtle}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.border[2];
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="submit"
              id="forgot-submit"
              disabled={isSendingReset}
              className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
              style={{
                background: theme.colors.accent.primary,
                color: theme.colors.bg.primary,
                fontSize: theme.typography.sizes.base,
                boxShadow: theme.shadows.accent,
                fontFamily: theme.typography.fonts.primary,
              }}
            >
              {isSendingReset ? <SpinnerLoader size="sm" /> : "Send Reset OTP"}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: theme.colors.health.recovery.bg }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={theme.colors.health.recovery.DEFAULT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p style={{ color: theme.colors.text.secondary, fontSize: theme.typography.sizes.base }}>
              If <span style={{ color: theme.colors.accent.primary, fontWeight: 600 }}>{email}</span> is registered, you'll receive a reset OTP shortly.
            </p>
            <p style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xs }}>
              Check your inbox and spam folder.
            </p>
          </div>
        )}

        <div className="text-center mt-6">
          <Link
            to={ROUTES.LOGIN}
            className="font-medium hover:underline"
            style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.sm }}
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
