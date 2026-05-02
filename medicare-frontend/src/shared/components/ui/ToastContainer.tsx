import { useToastStore } from "@/store/toastStore";
import { theme } from "@/config/theme";

const ICONS: Record<string, React.ReactNode> = {
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.health.recovery.DEFAULT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.health.danger.DEFAULT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.health.warning.DEFAULT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.health.strain.DEFAULT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

const BG_COLORS: Record<string, string> = {
  success: theme.colors.health.recovery.DEFAULT + "18",
  error: theme.colors.health.danger.DEFAULT + "18",
  warning: theme.colors.health.warning.DEFAULT + "18",
  info: theme.colors.health.strain.DEFAULT + "18",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-5 py-4 rounded-2xl pointer-events-auto animate-page-in"
          style={{
            background: theme.colors.surface[4],
            border: `1px solid ${theme.colors.border[2]}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            minWidth: "280px",
            maxWidth: "380px",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Icon */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: BG_COLORS[toast.type] }}
          >
            {ICONS[toast.type]}
          </div>

          {/* Message */}
          <span
            className="flex-1 text-sm font-medium leading-snug"
            style={{ color: theme.colors.text.secondary }}
          >
            {toast.message}
          </span>

          {/* Close */}
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-1 hover:opacity-100 transition-opacity"
            style={{ color: theme.colors.text.subtle, opacity: 0.6 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
