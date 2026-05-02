/**
 * DailyCheckinModal.tsx
 * ─────────────────────────────────────────────
 * A premium glassmorphic modal that appears when the user
 * hasn't logged their daily health data yet.
 *
 * Features:
 *   • Auto-shows on app load if today's data is missing
 *   • Rich animated form with medically-validated inputs
 *   • Partial submission allowed (fill what you want)
 *   • Submits to POST /health/daily/update
 *   • Only shows once per session (skip = dismiss for the session)
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/apiClient";
import { useToast } from "@/store/toastStore";
import { theme } from "@/config/theme";

// ── Types ──────────────────────────────────────────────────────

interface DailyHealthData {
  sleep_hours: string;
  steps: string;
  heart_rate: string;
  bp_systolic: string;
  bp_diastolic: string;
  weight: string;
  oxygen_level: string;
  stress_level: string;
  notes: string;
}

interface FieldConfig {
  key: keyof DailyHealthData;
  label: string;
  icon: string;
  placeholder: string;
  unit: string;
  type: "number" | "text";
  min?: number;
  max?: number;
  step?: number;
  color: string;
  group: "primary" | "secondary";
}

const FIELDS: FieldConfig[] = [
  {
    key: "sleep_hours",
    label: "Sleep",
    icon: "🌙",
    placeholder: "7.5",
    unit: "hours",
    type: "number",
    min: 0,
    max: 24,
    step: 0.5,
    color: theme.colors.health.sleep.DEFAULT,
    group: "primary",
  },
  {
    key: "steps",
    label: "Steps",
    icon: "🏃",
    placeholder: "8000",
    unit: "steps",
    type: "number",
    min: 0,
    max: 200000,
    step: 100,
    color: theme.colors.health.recovery.DEFAULT,
    group: "primary",
  },
  {
    key: "heart_rate",
    label: "Heart Rate",
    icon: "❤️",
    placeholder: "72",
    unit: "bpm",
    type: "number",
    min: 30,
    max: 220,
    step: 1,
    color: theme.colors.health.danger.DEFAULT,
    group: "primary",
  },
  {
    key: "bp_systolic",
    label: "BP Systolic",
    icon: "🩸",
    placeholder: "120",
    unit: "mmHg",
    type: "number",
    min: 60,
    max: 250,
    step: 1,
    color: theme.colors.health.warning.DEFAULT,
    group: "secondary",
  },
  {
    key: "bp_diastolic",
    label: "BP Diastolic",
    icon: "🩸",
    placeholder: "80",
    unit: "mmHg",
    type: "number",
    min: 40,
    max: 150,
    step: 1,
    color: theme.colors.health.warning.DEFAULT,
    group: "secondary",
  },
  {
    key: "weight",
    label: "Weight",
    icon: "⚖️",
    placeholder: "70",
    unit: "kg",
    type: "number",
    min: 10,
    max: 500,
    step: 0.1,
    color: theme.colors.health.strain.DEFAULT,
    group: "secondary",
  },
  {
    key: "oxygen_level",
    label: "Oxygen",
    icon: "💨",
    placeholder: "98",
    unit: "%",
    type: "number",
    min: 50,
    max: 100,
    step: 0.1,
    color: theme.colors.health.strain.DEFAULT,
    group: "secondary",
  },
  {
    key: "stress_level",
    label: "Stress",
    icon: "🧠",
    placeholder: "3",
    unit: "/10",
    type: "number",
    min: 1,
    max: 10,
    step: 1,
    color: theme.colors.health.warning.DEFAULT,
    group: "secondary",
  },
];

// ── Session storage key ────────────────────────────────────────
const SESSION_KEY = "medicare_daily_checkin_dismissed";

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Component ──────────────────────────────────────────────────

export function DailyCheckinModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState<DailyHealthData>({
    sleep_hours: "",
    steps: "",
    heart_rate: "",
    bp_systolic: "",
    bp_diastolic: "",
    weight: "",
    oxygen_level: "",
    stress_level: "",
    notes: "",
  });

  // ── Check if user has today's data on mount ───────────────
  useEffect(() => {
    // Delay the check slightly to let auth token initialize
    const timer = setTimeout(() => {
      checkDailyStatus();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const checkDailyStatus = async () => {
    // If already dismissed today, don't show
    const dismissed = sessionStorage.getItem(SESSION_KEY);
    if (dismissed === getTodayKey()) {
      console.log("[DailyCheckin] Already dismissed today, skipping.");
      setCheckingStatus(false);
      return;
    }

    try {
      console.log("[DailyCheckin] Checking daily health status...");
      const data = await api.get<{
        data_freshness?: string;
        record?: unknown;
      }>("/health/daily/latest");

      console.log("[DailyCheckin] API response:", data);

      // Show modal if data is NOT from today
      const freshness = data?.data_freshness;
      if (!data || freshness !== "today") {
        console.log(`[DailyCheckin] No today data (freshness=${freshness}), showing modal.`);
        setTimeout(() => {
          setIsOpen(true);
        }, 600);
      } else {
        console.log("[DailyCheckin] Today's data exists, skipping modal.");
      }
    } catch (err) {
      // If API fails, default to showing the modal
      // (better to ask than to silently skip)
      console.warn("[DailyCheckin] API check failed, showing modal:", err);
      setTimeout(() => {
        setIsOpen(true);
      }, 600);
    } finally {
      setCheckingStatus(false);
    }
  };

  // ── Handle input changes ──────────────────────────────────
  const handleChange = useCallback(
    (key: keyof DailyHealthData, value: string) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // ── Submit form ───────────────────────────────────────────
  const handleSubmit = async () => {
    // Build payload — only include non-empty fields
    const payload: Record<string, number | string> = {};
    let hasData = false;

    for (const field of FIELDS) {
      const val = formData[field.key];
      if (val !== "" && val !== undefined) {
        payload[field.key] = field.type === "number" ? parseFloat(val) : val;
        hasData = true;
      }
    }

    if (formData.notes.trim()) {
      payload.notes = formData.notes.trim();
      hasData = true;
    }

    if (!hasData) {
      toast.warning("Please fill in at least one health metric.");
      return;
    }

    // Validate BP pair
    if (
      (payload.bp_systolic && !payload.bp_diastolic) ||
      (!payload.bp_systolic && payload.bp_diastolic)
    ) {
      toast.warning("Please enter both systolic and diastolic blood pressure.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/health/daily/update", payload);
      toast.success("Today's health data saved! 🎉");
      dismiss();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        "Failed to save. Please check your values.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Dismiss modal ─────────────────────────────────────────
  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, getTodayKey());
    setIsOpen(false);
  };

  // Don't render anything while checking
  if (checkingStatus) return null;

  const primaryFields = FIELDS.filter((f) => f.group === "primary");
  const secondaryFields = FIELDS.filter((f) => f.group === "secondary");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="checkin-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={dismiss}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          />

          {/* Modal */}
          <motion.div
            key="checkin-modal"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 28,
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background: `linear-gradient(145deg, ${theme.colors.surface[2]}, ${theme.colors.surface[1]})`,
                border: `1px solid ${theme.colors.border[2]}`,
                borderRadius: theme.radius["2xl"],
                boxShadow: `${theme.shadows.card}, ${theme.shadows.accent}`,
                width: "100%",
                maxWidth: "520px",
                maxHeight: "85vh",
                overflowY: "auto",
                pointerEvents: "auto",
              }}
              className="scrollbar-none"
            >
              {/* Header */}
              <div
                style={{
                  padding: "28px 28px 0",
                  textAlign: "center",
                }}
              >
                {/* Animated icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.2,
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: theme.colors.accent.glow,
                    border: `2px solid ${theme.colors.accent.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: "28px",
                  }}
                >
                  📋
                </motion.div>

                <h2
                  style={{
                    fontFamily: theme.typography.fonts.primary,
                    fontSize: theme.typography.sizes.h1,
                    fontWeight: theme.typography.weights.bold,
                    color: theme.colors.text.primary,
                    marginBottom: "8px",
                  }}
                >
                  Daily Health Check-in
                </h2>
                <p
                  style={{
                    color: theme.colors.text.muted,
                    fontSize: theme.typography.sizes.sm,
                    lineHeight: 1.6,
                    maxWidth: "380px",
                    margin: "0 auto",
                  }}
                >
                  Log your vitals to get personalized insights. Fill in what you
                  know — every metric helps! 💪
                </p>
              </div>

              {/* Form */}
              <div style={{ padding: "24px 28px" }}>
                {/* Primary fields (always visible) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  {primaryFields.map((field, i) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={formData[field.key]}
                      onChange={handleChange}
                      index={i}
                    />
                  ))}
                </div>

                {/* Toggle for more fields */}
                <button
                  onClick={() => setShowMore((p) => !p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: theme.radius.lg,
                    background: theme.colors.surface[3],
                    border: `1px solid ${theme.colors.border[1]}`,
                    color: theme.colors.text.muted,
                    fontSize: theme.typography.sizes.sm,
                    cursor: "pointer",
                    marginBottom: "16px",
                    transition: "all 200ms",
                    fontFamily: theme.typography.fonts.primary,
                  }}
                >
                  <span
                    style={{
                      transform: showMore ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 200ms",
                      display: "inline-block",
                    }}
                  >
                    ▾
                  </span>
                  {showMore ? "Show Less" : "More Vitals (BP, Weight, O₂, Stress)"}
                </button>

                {/* Secondary fields (expandable) */}
                <AnimatePresence>
                  {showMore && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                          marginBottom: "16px",
                        }}
                      >
                        {secondaryFields.map((field, i) => (
                          <FieldInput
                            key={field.key}
                            field={field}
                            value={formData[field.key]}
                            onChange={handleChange}
                            index={i + primaryFields.length}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Notes */}
                <div style={{ marginBottom: "20px" }}>
                  <textarea
                    placeholder="Any notes about how you're feeling today..."
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: theme.radius.lg,
                      background: theme.colors.surface[3],
                      border: `1px solid ${theme.colors.border[2]}`,
                      color: theme.colors.text.secondary,
                      fontSize: theme.typography.sizes.sm,
                      fontFamily: theme.typography.fonts.primary,
                      resize: "none",
                      outline: "none",
                      transition: "border-color 200ms",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.colors.accent.primary;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.colors.border[2];
                    }}
                  />
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <button
                    onClick={dismiss}
                    style={{
                      flex: "0 0 auto",
                      padding: "12px 20px",
                      borderRadius: theme.radius.lg,
                      background: theme.colors.surface[4],
                      border: `1px solid ${theme.colors.border[2]}`,
                      color: theme.colors.text.muted,
                      fontSize: theme.typography.sizes.sm,
                      fontWeight: theme.typography.weights.medium,
                      cursor: "pointer",
                      fontFamily: theme.typography.fonts.primary,
                      transition: "all 200ms",
                    }}
                  >
                    Skip Today
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "12px 24px",
                      borderRadius: theme.radius.lg,
                      background: loading
                        ? theme.colors.accent.dark
                        : `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                      border: "none",
                      color: theme.colors.bg.primary,
                      fontSize: theme.typography.sizes.sm,
                      fontWeight: theme.typography.weights.bold,
                      cursor: loading ? "wait" : "pointer",
                      fontFamily: theme.typography.fonts.primary,
                      transition: "all 200ms",
                      boxShadow: loading ? "none" : theme.shadows.accent,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <LoadingDots />
                        Saving...
                      </span>
                    ) : (
                      "Save Today's Data ✓"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── FieldInput Component ─────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  index,
}: {
  field: FieldConfig;
  value: string;
  onChange: (key: keyof DailyHealthData, value: string) => void;
  index: number;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      style={{
        position: "relative",
        borderRadius: theme.radius.lg,
        background: focused ? theme.colors.surface[4] : theme.colors.surface[3],
        border: `1px solid ${focused ? field.color + "60" : theme.colors.border[1]}`,
        padding: "12px 14px",
        transition: "all 200ms",
        boxShadow: focused ? `0 0 16px ${field.color}15` : "none",
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontSize: "14px" }}>{field.icon}</span>
        <span
          style={{
            fontSize: theme.typography.sizes.xs,
            fontWeight: theme.typography.weights.semi,
            color: focused ? field.color : theme.colors.text.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            transition: "color 200ms",
            fontFamily: theme.typography.fonts.primary,
          }}
        >
          {field.label}
        </span>
      </div>

      {/* Input row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <input
          type={field.type}
          inputMode={field.type === "number" ? "decimal" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          min={field.min}
          max={field.max}
          step={field.step}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: theme.colors.text.primary,
            fontSize: theme.typography.sizes.h2,
            fontWeight: theme.typography.weights.bold,
            fontFamily: theme.typography.fonts.primary,
            padding: 0,
          }}
        />
        <span
          style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.text.subtle,
            whiteSpace: "nowrap",
            fontFamily: theme.typography.fonts.primary,
          }}
        >
          {field.unit}
        </span>
      </div>
    </motion.div>
  );
}

// ── Loading Dots ─────────────────────────────────────────────

function LoadingDots() {
  return (
    <span style={{ display: "inline-flex", gap: "3px" }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
          }}
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: theme.colors.bg.primary,
          }}
        />
      ))}
    </span>
  );
}
