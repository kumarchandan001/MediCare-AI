import { useState, useMemo } from "react";
import { useLocation, Navigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "@/config/constants";
import { theme } from "@/config/theme";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_CONFIG = [
  { label: "", color: "transparent", width: "0%" },
  { label: "Very Weak", color: theme.colors.health.danger.DEFAULT, width: "20%" },
  { label: "Weak", color: "#FF8C00", width: "40%" },
  { label: "Fair", color: theme.colors.health.warning.DEFAULT, width: "60%" },
  { label: "Strong", color: theme.colors.health.strain.DEFAULT, width: "80%" },
  { label: "Very Strong", color: theme.colors.health.recovery.DEFAULT, width: "100%" },
];

export default function ResetPasswordPage() {
  const location = useLocation();
  const { resetPassword, isResetting } = useAuth();

  const state = location.state as { token?: string } | null;
  const token = state?.token;

  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const sc = STRENGTH_CONFIG[strength];

  if (!token) {
    return <Navigate to={ROUTES.FORGOT_PASSWORD} replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) return;
    resetPassword({ token, password: form.password, confirm_password: form.confirm_password });
  };

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const inputStyle = {
    background: theme.colors.surface[3],
    border: `1.5px solid ${theme.colors.border[2]}`,
    color: theme.colors.text.primary,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.primary,
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = theme.colors.border.focus;
    e.target.style.boxShadow = `0 0 0 3px ${theme.colors.accent.subtle}`;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = theme.colors.border[2];
    e.target.style.boxShadow = "none";
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
            background: theme.colors.health.strain.bg,
            border: `1px solid ${theme.colors.health.strain.border}`,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.health.strain.DEFAULT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        </div>

        <h2
          className="text-center font-black tracking-tight mb-2"
          style={{ color: theme.colors.text.primary, fontSize: theme.typography.sizes.h1 }}
        >
          Set new password
        </h2>
        <p className="text-center mb-8" style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.sm }}>
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <label
              className="block mb-2 font-bold uppercase tracking-widest"
              style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xxs }}
            >
              New Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                id="reset-password"
                value={form.password}
                onChange={update("password")}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                required
                minLength={8}
                className="w-full px-4 py-3 pr-11 rounded-xl outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: theme.colors.text.subtle }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="mt-2">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: theme.colors.surface[4] }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: sc.width, background: sc.color }} />
                </div>
                <p className="text-right mt-1 font-semibold" style={{ color: sc.color, fontSize: theme.typography.sizes.xxs }}>
                  {sc.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              className="block mb-2 font-bold uppercase tracking-widest"
              style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xxs }}
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                id="reset-confirm-password"
                value={form.confirm_password}
                onChange={update("confirm_password")}
                placeholder="Re-enter password"
                required
                className="w-full px-4 py-3 pr-11 rounded-xl outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: theme.colors.text.subtle }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            {form.confirm_password && form.password !== form.confirm_password && (
              <p className="mt-1 font-medium" style={{ color: theme.colors.health.danger.DEFAULT, fontSize: theme.typography.sizes.xxs }}>
                Passwords do not match
              </p>
            )}
          </div>

          <button
            type="submit"
            id="reset-submit"
            disabled={isResetting || form.password !== form.confirm_password || form.password.length < 8}
            className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none mt-2"
            style={{
              background: theme.colors.accent.primary,
              color: theme.colors.bg.primary,
              fontSize: theme.typography.sizes.base,
              boxShadow: theme.shadows.accent,
              fontFamily: theme.typography.fonts.primary,
            }}
          >
            {isResetting ? <SpinnerLoader size="sm" /> : "Reset Password"}
          </button>
        </form>

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
