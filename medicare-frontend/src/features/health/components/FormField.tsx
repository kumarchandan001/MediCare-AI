import { theme } from "@/config/theme";

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, hint, error, required, children }: FormFieldProps) {
  return (
    <div>
      <label
        className="block mb-2 font-bold uppercase tracking-widest"
        style={{
          fontSize: theme.typography.sizes.xxs,
          color: error ? theme.colors.health.danger.DEFAULT : theme.colors.text.subtle,
        }}
      >
        {label}
        {required && (
          <span style={{ color: theme.colors.accent.primary, marginLeft: "3px" }}>*</span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p className="mt-1" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
          {hint}
        </p>
      )}

      {error && (
        <p
          className="mt-1 flex items-center gap-1"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.health.danger.DEFAULT }}
        >
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

// ── Reusable styled input ─────────────────
interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function StyledInput({ hasError, className, ...props }: StyledInputProps) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${className || ""}`}
      style={{
        background: theme.colors.surface[3],
        border: `1.5px solid ${hasError ? theme.colors.health.danger.DEFAULT : theme.colors.border[2]}`,
        color: theme.colors.text.primary,
        fontSize: theme.typography.sizes.base,
        fontFamily: theme.typography.fonts.primary,
        ...props.style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = theme.colors.border.focus;
        e.target.style.boxShadow = `0 0 0 3px ${theme.colors.accent.subtle}`;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.target.style.borderColor = hasError ? theme.colors.health.danger.DEFAULT : theme.colors.border[2];
        e.target.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

// ── Reusable styled select ────────────────
interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function StyledSelect({ children, ...props }: StyledSelectProps) {
  return (
    <select
      {...props}
      className="w-full px-4 py-3 rounded-xl outline-none transition-all appearance-none cursor-pointer"
      style={{
        background: theme.colors.surface[3],
        border: `1.5px solid ${theme.colors.border[2]}`,
        color: theme.colors.text.primary,
        fontSize: theme.typography.sizes.base,
        fontFamily: theme.typography.fonts.primary,
        ...props.style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = theme.colors.border.focus;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = theme.colors.border[2];
      }}
    >
      {children}
    </select>
  );
}

// ── Range slider with value display ──────
interface RangeFieldProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  color?: string;
}

export function RangeField({ value, onChange, min, max, step = 1, color }: RangeFieldProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const c = color || theme.colors.accent.primary;

  return (
    <div className="space-y-2">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${c} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
          outline: "none",
        }}
      />
      <div
        className="flex justify-between"
        style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
      >
        <span>{min}</span>
        <span className="font-black" style={{ fontSize: theme.typography.sizes.sm, color: c }}>
          {value}
        </span>
        <span>{max}</span>
      </div>
    </div>
  );
}
