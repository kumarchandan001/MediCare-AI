import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useProfileStore } from "../store/profileStore";
import { useToast } from "@/store/toastStore";

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function InfoSection() {
  const { user } = useAuthStore();
  const { userInfo, setUserInfo, markSaved } = useProfileStore();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ ...userInfo });

  const handleEdit = () => {
    setDraft({ ...userInfo });
    setIsEditing(true);
  };

  const handleSave = useCallback(() => {
    setUserInfo(draft);
    markSaved();
    setIsEditing(false);
    toast.success("Profile information updated");
  }, [draft, setUserInfo, markSaved, toast]);

  const handleCancel = () => {
    setDraft({ ...userInfo });
    setIsEditing(false);
  };

  const fields = [
    { key: "full_name" as const, label: "Full Name", icon: "fas fa-user", type: "text", placeholder: "Enter your full name" },
    { key: "phone" as const, label: "Phone", icon: "fas fa-phone", type: "tel", placeholder: "+91 00000 00000" },
    { key: "date_of_birth" as const, label: "Date of Birth", icon: "fas fa-cake-candles", type: "date", placeholder: "" },
    { key: "gender" as const, label: "Gender", icon: "fas fa-venus-mars", type: "select", placeholder: "Select gender" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[1],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Section Header — compact on mobile */}
      <div
        className="flex items-center justify-between px-3.5 py-3 sm:px-5 sm:py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
            style={{ background: theme.colors.accent.subtle, border: `1px solid ${theme.colors.accent.border}` }}
          >
            <i className="fas fa-id-card text-[10px] sm:text-xs" style={{ color: theme.colors.accent.primary }} />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm" style={{ color: theme.colors.text.primary }}>
              Personal Information
            </h3>
            <p className="text-[9px] sm:text-[10px] hidden sm:block" style={{ color: theme.colors.text.subtle }}>
              Your basic profile details
            </p>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95"
            style={{
              fontSize: theme.typography.sizes.xxs,
              fontFamily: theme.typography.fonts.primary,
              background: theme.colors.surface[3],
              color: theme.colors.accent.primary,
              border: `1px solid ${theme.colors.accent.border}`,
              minHeight: "32px",
            }}
          >
            <i className="fas fa-pen text-[10px]" /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCancel}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95"
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
                background: theme.colors.surface[3],
                border: `1px solid ${theme.colors.border[2]}`,
                minHeight: "32px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95"
              style={{
                fontSize: theme.typography.sizes.xxs,
                fontFamily: theme.typography.fonts.primary,
                background: theme.colors.accent.primary,
                color: theme.colors.bg.primary,
                minHeight: "32px",
                boxShadow: theme.shadows.accent,
              }}
            >
              <i className="fas fa-check text-[10px]" /> Save
            </button>
          </div>
        )}
      </div>

      {/* Content — tighter on mobile */}
      <div className="p-3.5 sm:p-5">
        {/* Email (read-only always) — compact */}
        <div className="mb-3 sm:mb-5 pb-3 sm:pb-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
          <div className="flex items-center gap-2 flex-wrap">
            <i className="fas fa-envelope text-[10px] opacity-40" style={{ color: theme.colors.text.subtle }} />
            <span className="text-xs sm:text-sm font-medium" style={{ color: theme.colors.text.secondary }}>
              {user?.email || "Not set"}
            </span>
            {user?.email_verified && (
              <i className="fas fa-circle-check text-[10px] sm:text-xs" style={{ color: theme.colors.health.recovery.DEFAULT }} />
            )}
          </div>
          <p className="text-[9px] sm:text-[10px] mt-0.5 ml-5" style={{ color: theme.colors.text.subtle }}>
            Email cannot be changed
          </p>
        </div>

        {/* Editable fields — always 2 columns */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label
                className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-1 sm:mb-2"
                style={{ color: theme.colors.text.subtle }}
              >
                <i className={`${field.icon} mr-1 opacity-60`} />
                {field.label}
              </label>

              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {field.type === "select" ? (
                      <select
                        value={draft[field.key]}
                        onChange={(e) => setDraft((p) => ({ ...p, [field.key]: e.target.value }))}
                        className="w-full rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm outline-none transition-all duration-200"
                        style={{
                          background: theme.colors.surface[3],
                          border: `1px solid ${theme.colors.border[2]}`,
                          color: draft[field.key] ? theme.colors.text.secondary : theme.colors.text.subtle,
                          fontFamily: theme.typography.fonts.primary,
                        }}
                      >
                        <option value="">{field.placeholder}</option>
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={draft[field.key]}
                        onChange={(e) => setDraft((p) => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm outline-none transition-all duration-200 placeholder:text-white/20"
                        style={{
                          background: theme.colors.surface[3],
                          border: `1px solid ${theme.colors.border[2]}`,
                          color: theme.colors.text.secondary,
                          fontFamily: theme.typography.fonts.primary,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border.focus;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border[2];
                        }}
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <p
                      className="text-xs sm:text-sm font-medium py-2 sm:py-3 px-1 truncate"
                      style={{ color: userInfo[field.key] ? theme.colors.text.secondary : theme.colors.text.subtle }}
                    >
                      {field.key === "date_of_birth" && userInfo[field.key]
                        ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(userInfo[field.key]))
                        : userInfo[field.key] || "Not set"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export { InfoSection };
