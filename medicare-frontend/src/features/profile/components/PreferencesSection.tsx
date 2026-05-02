import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useProfileStore } from "../store/profileStore";
import { useToast } from "@/store/toastStore";

interface ToggleItem {
  key: "notifications" | "emailReports" | "healthReminders" | "dataSharing";
  label: string;
  description: string;
  icon: string;
  color: string;
  colorBg: string;
  colorBorder: string;
}

const TOGGLES: ToggleItem[] = [
  {
    key: "notifications",
    label: "Push Notifications",
    description: "Health insights and reminders",
    icon: "fas fa-bell",
    color: theme.colors.accent.primary,
    colorBg: theme.colors.accent.subtle,
    colorBorder: theme.colors.accent.border,
  },
  {
    key: "emailReports",
    label: "Email Reports",
    description: "Weekly health summaries",
    icon: "fas fa-envelope",
    color: theme.colors.health.strain.DEFAULT,
    colorBg: theme.colors.health.strain.bg,
    colorBorder: theme.colors.health.strain.border,
  },
  {
    key: "healthReminders",
    label: "Health Reminders",
    description: "Medication & activity alerts",
    icon: "fas fa-clock",
    color: theme.colors.health.sleep.DEFAULT,
    colorBg: theme.colors.health.sleep.bg,
    colorBorder: theme.colors.health.sleep.border,
  },
  {
    key: "dataSharing",
    label: "Data Sharing",
    description: "Improve AI predictions",
    icon: "fas fa-share-nodes",
    color: theme.colors.health.warning.DEFAULT,
    colorBg: theme.colors.health.warning.bg,
    colorBorder: theme.colors.health.warning.border,
  },
];

function ToggleSwitch({
  checked,
  onChange,
  color,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shrink-0"
      style={{
        background: checked ? color : theme.colors.surface[4],
        boxShadow: checked ? `0 0 12px ${color}40` : "none",
      }}
    >
      <motion.span
        className="inline-block h-4 w-4 rounded-full"
        style={{
          background: checked ? theme.colors.bg.primary : theme.colors.text.subtle,
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
        animate={{ x: checked ? 22 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export default function PreferencesSection() {
  const { preferences, setPreference, markSaved } = useProfileStore();
  const toast = useToast();

  const handleToggle = (key: ToggleItem["key"], value: boolean) => {
    setPreference(key, value);
    markSaved();
    toast.info(`${value ? "Enabled" : "Disabled"} ${TOGGLES.find((t) => t.key === key)?.label}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[1],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Header — compact */}
      <div
        className="flex items-center gap-2 px-3.5 py-3 sm:px-5 sm:py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
          style={{
            background: theme.colors.health.sleep.bg,
            border: `1px solid ${theme.colors.health.sleep.border}`,
          }}
        >
          <i className="fas fa-sliders text-[10px] sm:text-xs" style={{ color: theme.colors.health.sleep.DEFAULT }} />
        </div>
        <div>
          <h3 className="font-bold text-xs sm:text-sm" style={{ color: theme.colors.text.primary }}>
            Preferences
          </h3>
          <p className="text-[9px] sm:text-[10px] hidden sm:block" style={{ color: theme.colors.text.subtle }}>
            Manage notifications and data settings
          </p>
        </div>
      </div>

      {/* Toggles List — tighter rows on mobile */}
      <div className="divide-y" style={{ borderColor: theme.colors.border[1] }}>
        {TOGGLES.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-center gap-2.5 sm:gap-4 px-3.5 py-2.5 sm:px-5 sm:py-4 transition-colors duration-200"
            style={{
              borderColor: theme.colors.border[1],
            }}
          >
            <div
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: toggle.colorBg,
                border: `1px solid ${toggle.colorBorder}`,
              }}
            >
              <i className={`${toggle.icon} text-[10px] sm:text-xs`} style={{ color: toggle.color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs sm:text-sm" style={{ color: theme.colors.text.primary }}>
                {toggle.label}
              </div>
              <div className="text-[10px] sm:text-[11px] hidden sm:block" style={{ color: theme.colors.text.subtle }}>
                {toggle.description}
              </div>
            </div>

            <ToggleSwitch
              checked={preferences[toggle.key]}
              onChange={(v) => handleToggle(toggle.key, v)}
              color={toggle.color}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export { PreferencesSection };
