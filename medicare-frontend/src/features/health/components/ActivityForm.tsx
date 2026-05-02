import { useState } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { FormField, StyledInput, StyledSelect } from "./FormField";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";
import type { ActivityFormData } from "../types/health.types";

const ACTIVITY_TYPES = [
  "Walking", "Running", "Cycling", "Swimming",
  "Yoga", "Gym", "Sports", "Dancing", "Other",
];

interface ActivityFormProps {
  onSubmit: (data: ActivityFormData) => void;
  isSaving: boolean;
}

export function ActivityForm({ onSubmit, isSaving }: ActivityFormProps) {
  const [form, setForm] = useState<ActivityFormData>({
    steps: 0,
    calories_burned: 0,
    duration_minutes: 0,
    activity_type: "Walking",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.steps === 0 && form.duration_minutes === 0) return;
    onSubmit(form);
    setForm({ steps: 0, calories_burned: 0, duration_minutes: 0, activity_type: "Walking" });
  };

  const FIELDS = [
    {
      key: "steps",
      label: "Steps",
      icon: "fa-person-walking",
      color: theme.colors.health.strain.DEFAULT,
      unit: "steps",
      hint: "Total steps today",
      min: 0,
      max: 99999,
    },
    {
      key: "calories_burned",
      label: "Calories Burned",
      icon: "fa-fire",
      color: theme.colors.health.warning.DEFAULT,
      unit: "kcal",
      hint: "Estimated calories",
      min: 0,
      max: 9999,
    },
    {
      key: "duration_minutes",
      label: "Duration",
      icon: "fa-clock",
      color: theme.colors.accent.primary,
      unit: "min",
      hint: "Active minutes",
      min: 0,
      max: 999,
    },
  ];

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
            background: theme.colors.health.strain.bg,
            border: `1px solid ${theme.colors.health.strain.border}`,
          }}
        >
          <i className="fas fa-person-running" style={{ color: theme.colors.health.strain.DEFAULT }} />
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
            Log Activity
          </h3>
          <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
            Track today's physical activity
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {FIELDS.map((field) => (
            <FormField key={field.key} label={`${field.label} (${field.unit})`} hint={field.hint}>
              <div className="relative">
                <i
                  className={`fas ${field.icon} absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none`}
                  style={{ color: field.color }}
                />
                <StyledInput
                  type="number"
                  value={(form as any)[field.key] || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [field.key]: Number(e.target.value) || 0 }))
                  }
                  min={field.min}
                  max={field.max}
                  placeholder="0"
                  style={{ paddingLeft: "2.75rem" }}
                />
              </div>
            </FormField>
          ))}

          {/* Activity type */}
          <FormField label="Activity Type">
            <StyledSelect
              value={form.activity_type}
              onChange={(e) => setForm((p) => ({ ...p, activity_type: e.target.value }))}
            >
              {ACTIVITY_TYPES.map((t) => (
                <option
                  key={t}
                  value={t}
                  style={{ background: theme.colors.surface[3], color: theme.colors.text.primary }}
                >
                  {t}
                </option>
              ))}
            </StyledSelect>
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
              Log Activity
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
