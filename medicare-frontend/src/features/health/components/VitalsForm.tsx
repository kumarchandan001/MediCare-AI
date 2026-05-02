import { useState } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { FormField, StyledInput, RangeField } from "./FormField";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";
import type { VitalsFormData } from "../types/health.types";

interface VitalsFormProps {
  onSubmit: (data: VitalsFormData) => void;
  isSaving: boolean;
}

const VITALS_FIELDS = [
  {
    key: "sleep_hours",
    label: "Sleep Hours",
    icon: "fa-moon",
    color: theme.colors.health.sleep.DEFAULT,
    unit: "hours",
    type: "number" as const,
    min: 0,
    max: 24,
    step: 0.5,
    hint: "Last night's total sleep",
  },
  {
    key: "heart_rate",
    label: "Heart Rate",
    icon: "fa-heart-pulse",
    color: theme.colors.health.danger.DEFAULT,
    unit: "bpm",
    type: "number" as const,
    min: 30,
    max: 220,
    step: 1,
    hint: "Resting heart rate",
  },
  {
    key: "oxygen_level",
    label: "Oxygen Saturation",
    icon: "fa-lungs",
    color: theme.colors.health.strain.DEFAULT,
    unit: "%",
    type: "number" as const,
    min: 70,
    max: 100,
    step: 0.1,
    hint: "SpO2 percentage",
  },
  {
    key: "body_temperature",
    label: "Body Temperature",
    icon: "fa-thermometer-half",
    color: theme.colors.health.warning.DEFAULT,
    unit: "°F",
    type: "number" as const,
    min: 90,
    max: 110,
    step: 0.1,
    hint: "Normal: 97.8–99.1°F",
  },
  {
    key: "blood_pressure",
    label: "Blood Pressure",
    icon: "fa-stethoscope",
    color: theme.colors.accent.primary,
    unit: "mmHg",
    type: "text" as const,
    min: undefined,
    max: undefined,
    step: undefined,
    hint: "Format: 120/80",
  },
];

export function VitalsForm({ onSubmit, isSaving }: VitalsFormProps) {
  const [form, setForm] = useState<VitalsFormData>({});
  const [stressLevel, setStressLevel] = useState(5);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.heart_rate && (form.heart_rate < 30 || form.heart_rate > 220)) {
      errs.heart_rate = "Must be 30–220 bpm";
    }
    if (form.oxygen_level && (form.oxygen_level < 70 || form.oxygen_level > 100)) {
      errs.oxygen_level = "Must be 70–100%";
    }
    if (form.sleep_hours && form.sleep_hours > 24) {
      errs.sleep_hours = "Cannot exceed 24 hours";
    }
    if (form.blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(form.blood_pressure)) {
      errs.blood_pressure = "Format: 120/80";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const hasData = Object.values(form).some((v) => v !== undefined && v !== "");
    if (!hasData) return;
    onSubmit({ ...form, stress_level: stressLevel, notes: notes || undefined });
    setForm({});
    setNotes("");
    setStressLevel(5);
    setErrors({});
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: theme.colors.health.danger.bg,
            border: `1px solid ${theme.colors.health.danger.border}`,
          }}
        >
          <i className="fas fa-heart-pulse" style={{ color: theme.colors.health.danger.DEFAULT }} />
        </div>
        <div>
          <h3
            className="font-black tracking-tight"
            style={{
              fontSize: theme.typography.sizes.h3,
              color: theme.colors.text.primary,
              letterSpacing: "-0.02em",
            }}
          >
            Log Today's Vitals
          </h3>
          <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
            Fill in any metrics you have available
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {VITALS_FIELDS.map((field) => (
            <FormField
              key={field.key}
              label={`${field.label}${field.unit ? ` (${field.unit})` : ""}`}
              hint={field.hint}
              error={errors[field.key]}
            >
              <div className="relative">
                <i
                  className={`fas ${field.icon} absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none`}
                  style={{ color: field.color }}
                />
                <StyledInput
                  type={field.type}
                  value={(form as Record<string, unknown>)[field.key] as string ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      [field.key]:
                        field.type === "number"
                          ? e.target.value
                            ? Number(e.target.value)
                            : undefined
                          : e.target.value || undefined,
                    }))
                  }
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  placeholder={field.type === "number" ? `e.g. ${field.min}` : "120/80"}
                  hasError={!!errors[field.key]}
                  style={{ paddingLeft: "2.75rem" }}
                />
              </div>
            </FormField>
          ))}
        </div>

        {/* Stress Level Slider */}
        <div className="mb-5">
          <FormField label="Stress Level" hint="1 = Very calm, 10 = Extremely stressed">
            <RangeField
              value={stressLevel}
              onChange={setStressLevel}
              min={1}
              max={10}
              color={
                stressLevel >= 7
                  ? theme.colors.health.danger.DEFAULT
                  : stressLevel >= 5
                  ? theme.colors.health.warning.DEFAULT
                  : theme.colors.health.recovery.DEFAULT
              }
            />
          </FormField>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <FormField label="Notes (Optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional observations..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl outline-none transition-all resize-none"
              style={{
                background: theme.colors.surface[3],
                border: `1.5px solid ${theme.colors.border[2]}`,
                color: theme.colors.text.primary,
                fontSize: theme.typography.sizes.sm,
                fontFamily: theme.typography.fonts.primary,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.colors.border.focus;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.colors.border[2];
              }}
            />
          </FormField>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:pointer-events-none"
          style={{
            background: theme.colors.accent.primary,
            color: theme.colors.bg.primary,
            fontSize: theme.typography.sizes.base,
            fontFamily: theme.typography.fonts.primary,
            boxShadow: theme.shadows.accent,
          }}
        >
          {isSaving ? (
            <SpinnerLoader size="sm" />
          ) : (
            <>
              <i className="fas fa-floppy-disk" />
              Save Vitals
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
