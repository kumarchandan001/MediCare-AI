import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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

export default function SignupPage() {
  const { signup, isSigningUp } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const sc = STRENGTH_CONFIG[strength];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup(form);
  };

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

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

  const labelCls = "block mb-2 font-bold uppercase tracking-widest";
  const labelStyle = { color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xxs };

  const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-80" style={{ color: theme.colors.text.subtle }}>
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );

  return (
    <div style={{ background: theme.colors.bg.primary }} className="min-h-screen flex">
      {/* ─── Left Brand Panel ─────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between px-14 py-14 w-[480px] flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${theme.colors.surface[2]} 0%, ${theme.colors.bg.primary} 100%)`,
          borderRight: `1px solid ${theme.colors.border[1]}`,
        }}
      >
        <div className="absolute bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${theme.colors.health.strain.glow}, transparent 65%)` }} />
        <div className="absolute top-[20%] right-[-60px] w-[240px] h-[240px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${theme.colors.health.sleep.glow}, transparent 65%)` }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: theme.colors.accent.primary, boxShadow: theme.shadows.accent }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.bg.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-tight" style={{ color: theme.colors.text.primary }}>MediCare AI</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.colors.text.subtle }}>Health Intelligence</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 -mt-8">
          <h2 className="font-black leading-[1.1] tracking-tight mb-5" style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", color: theme.colors.text.primary }}>
            Start your{" "}
            <span style={{ color: theme.colors.accent.primary, textShadow: `0 0 40px ${theme.colors.accent.glow}` }}>health</span>{" "}journey
          </h2>
          <p className="leading-relaxed" style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.base, maxWidth: "340px" }}>
            AI-powered health intelligence. Disease prediction, vital monitoring, and personalized insights — all in one platform.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 flex flex-wrap gap-2">
          {["AI Disease Prediction", "Vital Monitoring", "Health Insights", "Secure & Private"].map((f) => (
            <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: theme.colors.surface[4], color: theme.colors.text.muted, border: `1px solid ${theme.colors.border[2]}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.accent.primary }} />
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Right Form Panel ─────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: theme.colors.accent.primary, boxShadow: theme.shadows.accent }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.bg.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <h1 className="font-black text-lg" style={{ color: theme.colors.text.primary }}>MediCare AI</h1>
          </div>

          {/* Header */}
          <div className="mb-7">
            <h2 className="font-black tracking-tight mb-2" style={{ color: theme.colors.text.primary, fontSize: theme.typography.sizes.h1 }}>
              Create account
            </h2>
            <p style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.sm }}>
              Already have an account?{" "}
              <Link to={ROUTES.LOGIN} className="font-semibold hover:underline" style={{ color: theme.colors.accent.primary }}>Login →</Link>
            </p>
          </div>

          {/* OTP info */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl mb-6" style={{ background: theme.colors.accent.subtle, border: `1px solid ${theme.colors.accent.border}` }}>
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <p style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.xs }}>
              After signing up, we'll send an <span style={{ color: theme.colors.accent.primary, fontWeight: 600 }}>OTP to your email</span> for verification.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className={labelCls} style={labelStyle}>Username</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" id="signup-username" value={form.username} onChange={update("username")} placeholder="johndoe" required minLength={3} className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all" style={inputBase} onFocus={handleFocus} onBlur={handleBlur} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls} style={labelStyle}>Email Address</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input type="email" id="signup-email" value={form.email} onChange={update("email")} placeholder="you@example.com" required className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all" style={inputBase} onFocus={handleFocus} onBlur={handleBlur} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={labelCls} style={labelStyle}>Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type={showPw ? "text" : "password"} id="signup-password" value={form.password} onChange={update("password")} placeholder="Min 8 chars, 1 uppercase, 1 number" required minLength={8} className="w-full pl-11 pr-11 py-3.5 rounded-xl outline-none transition-all" style={inputBase} onFocus={handleFocus} onBlur={handleBlur} />
                <EyeBtn show={showPw} toggle={() => setShowPw((p) => !p)} />
              </div>
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: theme.colors.surface[4] }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: sc.width, background: sc.color }} />
                  </div>
                  <p className="text-right mt-1 font-semibold" style={{ color: sc.color, fontSize: theme.typography.sizes.xxs }}>{sc.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelCls} style={labelStyle}>Confirm Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <input type={showConfirm ? "text" : "password"} id="signup-confirm-password" value={form.confirm_password} onChange={update("confirm_password")} placeholder="Re-enter password" required className="w-full pl-11 pr-11 py-3.5 rounded-xl outline-none transition-all" style={inputBase} onFocus={handleFocus} onBlur={handleBlur} />
                <EyeBtn show={showConfirm} toggle={() => setShowConfirm((p) => !p)} />
              </div>
              {form.confirm_password && form.password !== form.confirm_password && (
                <p className="mt-1 font-medium" style={{ color: theme.colors.health.danger.DEFAULT, fontSize: theme.typography.sizes.xxs }}>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="signup-submit"
              disabled={isSigningUp || form.password !== form.confirm_password}
              className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none mt-2"
              style={{
                background: theme.colors.accent.primary,
                color: theme.colors.bg.primary,
                fontSize: theme.typography.sizes.base,
                boxShadow: theme.shadows.accent,
                fontFamily: theme.typography.fonts.primary,
              }}
            >
              {isSigningUp ? (
                <SpinnerLoader size="sm" />
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6" style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xs }}>
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
