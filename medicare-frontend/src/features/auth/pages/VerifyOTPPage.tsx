import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "@/config/constants";
import { theme } from "@/config/theme";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";
import type { OTPPurpose } from "../types/auth.types";

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 10 * 60;

export default function VerifyOTPPage() {
  const location = useLocation();
  const { verifyOTP, isVerifying, resendOTP, isResending } = useAuth();

  const state = location.state as {
    email?: string;
    purpose?: OTPPurpose;
  } | null;

  const email = state?.email || "";
  const purpose = state?.purpose || "login";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [cooldown, setCooldown] = useState(60);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const otpValue = digits.join("");
  const isComplete = otpValue.length === OTP_LENGTH && digits.every((d) => d !== "");

  // ── Expiry countdown ─────────────────
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  // ── Resend cooldown ───────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((p) => {
        if (p <= 1) { clearInterval(t); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Input handlers ────────────────────
  const handleChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "");
    if (!digit) return;
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit.slice(-1);
      return next;
    });
    if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          setDigits((prev) => { const n = [...prev]; n[index] = ""; return n; });
        } else if (index > 0) {
          inputsRef.current[index - 1]?.focus();
          setDigits((prev) => { const n = [...prev]; n[index - 1] = ""; return n; });
        }
      }
      if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
      if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
    },
    [digits]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputsRef.current[Math.min(pasted.length - 1, OTP_LENGTH - 1)]?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || !email) return;
    verifyOTP({ email, otp: otpValue, purpose });
  };

  const handleResend = () => {
    if (cooldown > 0 || !email) return;
    resendOTP({ email, purpose });
    setCooldown(60);
    setTimeLeft(OTP_EXPIRY_SECONDS);
    setDigits(Array(OTP_LENGTH).fill(""));
    inputsRef.current[0]?.focus();
  };

  const purposeLabels: Record<OTPPurpose, string> = {
    signup: "Account Verification",
    login: "Login Verification",
    reset_password: "Password Reset",
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
            background: theme.colors.accent.subtle,
            border: `1px solid ${theme.colors.accent.border}`,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
          </svg>
        </div>

        {/* Header */}
        <h2
          className="text-center font-black tracking-tight mb-2"
          style={{ color: theme.colors.text.primary, fontSize: theme.typography.sizes.h1 }}
        >
          {purposeLabels[purpose]}
        </h2>
        <p className="text-center mb-8" style={{ color: theme.colors.text.muted, fontSize: theme.typography.sizes.sm }}>
          OTP sent to{" "}
          <span style={{ color: theme.colors.accent.primary, fontWeight: 600 }}>{email}</span>
        </p>

        {/* Timer */}
        <div className="text-center mb-6">
          <span
            style={{
              color: timeLeft <= 60 ? theme.colors.health.danger.DEFAULT : theme.colors.text.muted,
              fontSize: theme.typography.sizes.xs,
              fontWeight: 600,
            }}
          >
            {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : "OTP expired — request a new one"}
          </span>
        </div>

        {/* OTP Boxes */}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digits[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoFocus={i === 0}
                id={`otp-input-${i}`}
                className="w-12 h-14 text-center rounded-xl outline-none transition-all caret-transparent"
                style={{
                  background: digits[i] ? theme.colors.accent.subtle : theme.colors.surface[3],
                  border: `2px solid ${digits[i] ? theme.colors.accent.border : theme.colors.border[2]}`,
                  color: theme.colors.text.primary,
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  fontFamily: theme.typography.fonts.mono,
                }}
              />
            ))}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            id="otp-submit"
            disabled={!isComplete || isVerifying || timeLeft <= 0}
            className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: isComplete ? theme.colors.accent.primary : theme.colors.surface[4],
              color: isComplete ? theme.colors.bg.primary : theme.colors.text.subtle,
              fontFamily: theme.typography.fonts.primary,
              boxShadow: isComplete ? theme.shadows.accent : "none",
              transition: "all 0.2s ease",
            }}
          >
            {isVerifying ? (
              <SpinnerLoader size="sm" />
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                </svg>
                Verify OTP
              </>
            )}
          </button>
        </form>

        {/* Resend */}
        <div className="text-center mt-5">
          <button
            onClick={handleResend}
            id="otp-resend"
            disabled={cooldown > 0 || isResending}
            className="font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{
              color: cooldown > 0 ? theme.colors.text.subtle : theme.colors.accent.primary,
              fontSize: theme.typography.sizes.sm,
              fontFamily: theme.typography.fonts.primary,
            }}
          >
            {isResending ? "Sending..." : cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
          </button>
        </div>

        {/* Back link */}
        <div className="text-center mt-4">
          <Link
            to={ROUTES.LOGIN}
            style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.xs }}
            className="hover:underline"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
