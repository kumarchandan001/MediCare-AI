import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { FormField, StyledInput } from "./FormField";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";
import type { BMIFormData, BMIResult } from "../types/health.types";

interface BMICalculatorProps {
  onSubmit: (data: BMIFormData) => void;
  isSaving: boolean;
  result: BMIResult | null;
}

const BMI_RANGES = [
  { label: "Underweight", range: "< 18.5", color: theme.colors.health.strain.DEFAULT, min: 0, max: 18.5 },
  { label: "Normal", range: "18.5–24.9", color: theme.colors.health.recovery.DEFAULT, min: 18.5, max: 25 },
  { label: "Overweight", range: "25–29.9", color: theme.colors.health.warning.DEFAULT, min: 25, max: 30 },
  { label: "Obese", range: "≥ 30", color: theme.colors.health.danger.DEFAULT, min: 30, max: 100 },
];

function getBMIColor(bmi: number): string {
  if (bmi < 18.5) return theme.colors.health.strain.DEFAULT;
  if (bmi < 25) return theme.colors.health.recovery.DEFAULT;
  if (bmi < 30) return theme.colors.health.warning.DEFAULT;
  return theme.colors.health.danger.DEFAULT;
}

function getBMIPosition(bmi: number): number {
  const clamped = Math.min(Math.max(bmi, 10), 40);
  return ((clamped - 10) / 30) * 100;
}

export function BMICalculator({ onSubmit, isSaving, result }: BMICalculatorProps) {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const h = Number(height);
    const w = Number(weight);
    if (!h || h < 50 || h > 300) errs.height = "Enter height 50–300 cm";
    if (!w || w < 10 || w > 500) errs.weight = "Enter weight 10–500 kg";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ height: Number(height), weight: Number(weight) });
  };

  const bmiColor = result ? getBMIColor(result.bmi) : theme.colors.accent.primary;
  const bmiPos = result ? getBMIPosition(result.bmi) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: theme.colors.health.recovery.bg,
            border: `1px solid ${theme.colors.health.recovery.border}`,
          }}
        >
          <i className="fas fa-weight-scale" style={{ color: theme.colors.health.recovery.DEFAULT }} />
        </div>
        <div>
          <h3
            className="font-black tracking-tight"
            style={{ fontSize: theme.typography.sizes.h3, color: theme.colors.text.primary, letterSpacing: "-0.02em" }}
          >
            BMI Calculator
          </h3>
          <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
            Body Mass Index measurement
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <FormField label="Height (cm)" hint="e.g. 175" error={errors.height} required>
            <div className="relative">
              <i
                className="fas fa-ruler-vertical absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                style={{ color: theme.colors.accent.primary }}
              />
              <StyledInput
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
                min={50}
                max={300}
                hasError={!!errors.height}
                style={{ paddingLeft: "2.75rem" }}
              />
            </div>
          </FormField>

          <FormField label="Weight (kg)" hint="e.g. 70" error={errors.weight} required>
            <div className="relative">
              <i
                className="fas fa-weight-hanging absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                style={{ color: theme.colors.health.warning.DEFAULT }}
              />
              <StyledInput
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                min={10}
                max={500}
                hasError={!!errors.weight}
                style={{ paddingLeft: "2.75rem" }}
              />
            </div>
          </FormField>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:pointer-events-none mb-5"
          style={{
            background: theme.colors.accent.primary,
            color: theme.colors.bg.primary,
            fontSize: theme.typography.sizes.base,
            fontFamily: theme.typography.fonts.primary,
            boxShadow: theme.shadows.accent,
          }}
        >
          {isSaving ? <SpinnerLoader size="sm" /> : (<><i className="fas fa-calculator" /> Calculate BMI</>)}
        </button>
      </form>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div
              className="text-center p-6 rounded-xl mb-4"
              style={{ background: `${bmiColor}10`, border: `1px solid ${bmiColor}25` }}
            >
              <div
                className="font-black leading-none mb-2"
                style={{ fontSize: theme.typography.sizes.display, color: bmiColor, letterSpacing: "-0.05em" }}
              >
                {result.bmi}
              </div>
              <div
                className="font-bold uppercase tracking-widest"
                style={{ fontSize: theme.typography.sizes.sm, color: bmiColor }}
              >
                {result.category}
              </div>
              <div className="mt-2" style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
                {result.height}cm · {result.weight}kg
              </div>
            </div>

            {/* BMI Scale */}
            <div className="mb-4">
              <div
                className="relative h-3 rounded-full overflow-hidden mb-2"
                style={{
                  background: `linear-gradient(to right, ${theme.colors.health.strain.DEFAULT} 0%, ${theme.colors.health.recovery.DEFAULT} 30%, ${theme.colors.health.warning.DEFAULT} 60%, ${theme.colors.health.danger.DEFAULT} 100%)`,
                }}
              >
                <motion.div
                  className="absolute top-1/2 w-4 h-4 rounded-full bg-white border-2 -translate-y-1/2 -translate-x-1/2"
                  initial={{ left: "0%" }}
                  animate={{ left: `${bmiPos}%` }}
                  transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                  style={{ borderColor: bmiColor, boxShadow: `0 0 8px ${bmiColor}` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-1">
                {BMI_RANGES.map((r) => (
                  <div key={r.label} className="text-center">
                    <div className="font-bold uppercase tracking-wider" style={{ fontSize: "0.55rem", color: r.color }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: "0.55rem", color: theme.colors.text.subtle }}>{r.range}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BMI reference table */}
      {!result && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.colors.border[1]}` }}>
          <div
            className="grid grid-cols-3 px-4 py-2"
            style={{ background: theme.colors.surface[3], borderBottom: `1px solid ${theme.colors.border[1]}` }}
          >
            {["Category", "BMI Range", "Status"].map((h) => (
              <span
                key={h}
                className="font-bold uppercase tracking-widest"
                style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}
              >
                {h}
              </span>
            ))}
          </div>
          {BMI_RANGES.map((r, i) => (
            <div
              key={r.label}
              className="grid grid-cols-3 px-4 py-3"
              style={{
                borderBottom: i < BMI_RANGES.length - 1 ? `1px solid ${theme.colors.border[1]}` : "none",
              }}
            >
              <span className="font-semibold" style={{ fontSize: theme.typography.sizes.sm, color: r.color }}>
                {r.label}
              </span>
              <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.muted }}>{r.range}</span>
              <div className="w-2 h-2 rounded-full self-center" style={{ background: r.color }} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
