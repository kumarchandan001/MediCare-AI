import { useState } from "react";
import { theme } from "@/config/theme";
import type { CreateContactPayload } from "../types/emergency.types";

const RELATIONSHIPS = [
  "Father", "Mother", "Spouse", "Partner",
  "Sibling", "Child", "Friend",
  "Doctor", "Colleague", "Other",
];

interface ContactFormProps {
  onSubmit: (data: CreateContactPayload) => void;
  initialData?: Partial<CreateContactPayload>;
  isSaving: boolean;
  submitLabel?: string;
}

export function ContactForm({ onSubmit, initialData, isSaving, submitLabel = "Save Contact" }: ContactFormProps) {
  const [form, setForm] = useState<CreateContactPayload>({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    relationship: initialData?.relationship || "Other",
    is_primary: initialData?.is_primary || false,
    notes: initialData?.notes || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!/^[+\d\s-]{6,20}$/.test(form.phone)) errs.phone = "Enter a valid phone number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, notes: form.notes || undefined });
  };

  const inputStyle = (hasError?: boolean) => ({
    background: theme.colors.surface[3],
    border: `1.5px solid ${hasError ? theme.colors.health.danger.DEFAULT : theme.colors.border[2]}`,
    color: theme.colors.text.primary,
    fontSize: "16px",
    fontFamily: theme.typography.fonts.primary,
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label
          className="block mb-1.5 font-bold uppercase tracking-widest"
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: errors.name ? theme.colors.health.danger.DEFAULT : theme.colors.text.subtle,
          }}
        >
          Full Name *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Contact's full name"
          className="w-full px-4 py-3 rounded-xl outline-none transition-all"
          style={inputStyle(!!errors.name)}
        />
        {errors.name && (
          <p className="mt-1 text-xs" style={{ color: theme.colors.health.danger.DEFAULT }}>{errors.name}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label
          className="block mb-1.5 font-bold uppercase tracking-widest"
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: errors.phone ? theme.colors.health.danger.DEFAULT : theme.colors.text.subtle,
          }}
        >
          Phone Number *
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          placeholder="+91 98765 43210"
          className="w-full px-4 py-3 rounded-xl outline-none transition-all"
          style={inputStyle(!!errors.phone)}
        />
        {errors.phone && (
          <p className="mt-1 text-xs" style={{ color: theme.colors.health.danger.DEFAULT }}>{errors.phone}</p>
        )}
      </div>

      {/* Relationship */}
      <div>
        <label
          className="block mb-1.5 font-bold uppercase tracking-widest"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
        >
          Relationship
        </label>
        <select
          value={form.relationship}
          onChange={(e) => setForm((p) => ({ ...p, relationship: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl outline-none appearance-none cursor-pointer"
          style={inputStyle()}
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r} style={{ background: theme.colors.surface[3], color: theme.colors.text.primary }}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label
          className="block mb-1.5 font-bold uppercase tracking-widest"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
        >
          Notes (Optional)
        </label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="e.g. Available 24/7"
          className="w-full px-4 py-3 rounded-xl outline-none transition-all"
          style={inputStyle()}
        />
      </div>

      {/* Primary toggle */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
      >
        <div>
          <div className="font-semibold" style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary }}>
            Primary Contact
          </div>
          <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
            First to be notified in emergency
          </div>
        </div>
        <button
          type="button"
          onClick={() => setForm((p) => ({ ...p, is_primary: !p.is_primary }))}
          className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
          style={{
            background: form.is_primary ? theme.colors.accent.primary : theme.colors.surface[5],
            border: `1px solid ${form.is_primary ? theme.colors.accent.border : theme.colors.border[2]}`,
            minWidth: "44px", minHeight: "24px",
          }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{
              left: form.is_primary ? "calc(100% - 22px)" : "2px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{
          background: theme.colors.accent.primary,
          color: theme.colors.bg.primary,
          fontSize: theme.typography.sizes.base,
          fontFamily: theme.typography.fonts.primary,
          boxShadow: theme.shadows.accent,
          minHeight: "52px",
        }}
      >
        {isSaving ? (
          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        ) : (
          <><i className="fas fa-user-plus" /> {submitLabel}</>
        )}
      </button>
    </form>
  );
}
