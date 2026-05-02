import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { useProfileStore } from "../store/profileStore";
import { useToast } from "@/store/toastStore";
import { LANGUAGES, type AppLanguage } from "../types/profile.types";

export default function LanguageSwitcher() {
  const { preferences, setLanguage, markSaved } = useProfileStore();
  const toast = useToast();

  const handleLanguageChange = (lang: AppLanguage) => {
    setLanguage(lang);
    markSaved();
    const langLabel = LANGUAGES.find((l) => l.code === lang)?.label;
    toast.info(`Language set to ${langLabel}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
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
            background: theme.colors.health.strain.bg,
            border: `1px solid ${theme.colors.health.strain.border}`,
          }}
        >
          <i className="fas fa-globe text-[10px] sm:text-xs" style={{ color: theme.colors.health.strain.DEFAULT }} />
        </div>
        <div>
          <h3 className="font-bold text-xs sm:text-sm" style={{ color: theme.colors.text.primary }}>
            Language
          </h3>
          <p className="text-[9px] sm:text-[10px] hidden sm:block" style={{ color: theme.colors.text.subtle }}>
            Choose your preferred app language
          </p>
        </div>
      </div>

      {/* Language Cards — always 3 columns */}
      <div className="p-3.5 sm:p-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {LANGUAGES.map((lang) => {
            const isActive = preferences.language === lang.code;

            return (
              <motion.button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                whileTap={{ scale: 0.97 }}
                className="relative rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-left transition-all duration-300 group"
                style={{
                  background: isActive ? theme.colors.accent.subtle : theme.colors.surface[2],
                  border: `1.5px solid ${isActive ? theme.colors.accent.primary : theme.colors.border[1]}`,
                  boxShadow: isActive ? theme.shadows.accent : "none",
                }}
              >
                {/* Check badge */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center"
                    style={{ background: theme.colors.accent.primary }}
                  >
                    <i className="fas fa-check text-[7px] sm:text-[9px]" style={{ color: theme.colors.bg.primary }} />
                  </motion.div>
                )}

                {/* Flag */}
                <div className="text-lg sm:text-2xl mb-1 sm:mb-2">{lang.flag}</div>

                {/* Label */}
                <div
                  className="font-bold text-[11px] sm:text-sm"
                  style={{ color: isActive ? theme.colors.accent.primary : theme.colors.text.primary }}
                >
                  {lang.label}
                </div>
                <div
                  className="text-[10px] sm:text-xs mt-0.5"
                  style={{ color: isActive ? theme.colors.accent.secondary : theme.colors.text.subtle }}
                >
                  {lang.nativeLabel}
                </div>

                {/* Active indicator line */}
                {isActive && (
                  <motion.div
                    layoutId="lang-indicator"
                    className="absolute bottom-0 left-2 right-2 sm:left-4 sm:right-4 h-0.5 rounded-full"
                    style={{ background: theme.colors.accent.primary }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Info note — hidden on mobile to save space */}
        <div
          className="hidden sm:flex items-start gap-2.5 mt-4 p-3 rounded-xl"
          style={{
            background: theme.colors.health.strain.bg,
            border: `1px solid ${theme.colors.health.strain.border}`,
          }}
        >
          <i
            className="fas fa-circle-info mt-0.5 text-xs shrink-0"
            style={{ color: theme.colors.health.strain.DEFAULT }}
          />
          <p className="text-[11px] leading-relaxed" style={{ color: theme.colors.text.muted }}>
            Language changes apply to the app interface. AI-generated health insights and reports will be provided in the selected language where available.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export { LanguageSwitcher };
