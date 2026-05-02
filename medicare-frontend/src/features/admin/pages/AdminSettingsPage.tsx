import { useState } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";
import { useAppSettings, useAdminActions } from "../hooks/useAdmin";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useToast } from "@/shared/hooks/useToast";
import type { AppSetting } from "../types/admin.types";

function SettingRow({ setting, onUpdate, isUpdating }: {
  setting: AppSetting; onUpdate: (key: string, value: string) => void; isUpdating: boolean;
}) {
  const [value, setValue] = useState(setting.value);
  const changed = value !== setting.value;

  const isBool = setting.value_type === "boolean";

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-4 px-5 py-4"
      style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold" style={{ color: theme.colors.text.primary, fontSize: theme.typography.sizes.sm }}>{setting.key}</span>
          <span className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{
            fontSize: "0.55rem",
            background: setting.is_public ? theme.colors.health.recovery.bg : theme.colors.surface[4],
            color: setting.is_public ? theme.colors.health.recovery.DEFAULT : theme.colors.text.subtle,
          }}>{setting.is_public ? "Public" : "Private"}</span>
          <span className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{
            fontSize: "0.55rem", background: theme.colors.accent.subtle, color: theme.colors.accent.primary,
          }}>{setting.value_type}</span>
        </div>
        {setting.description && (
          <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>{setting.description}</p>
        )}
        {setting.updated_at && (
          <p style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, marginTop: "2px" }}>
            Last updated: {new Date(setting.updated_at).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {isBool ? (
          <button onClick={() => onUpdate(setting.key, setting.value === "true" ? "false" : "true")}
            disabled={isUpdating}
            className="w-12 h-6 rounded-full relative transition-colors disabled:opacity-50 cursor-pointer"
            style={{ background: setting.value === "true" ? theme.colors.health.recovery.DEFAULT : theme.colors.surface[4] }}>
            <div className="absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all" style={{
              left: setting.value === "true" ? "26px" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </button>
        ) : (
          <>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)}
              className="px-3 py-1.5 rounded-lg outline-none"
              style={{
                background: theme.colors.surface[3], border: `1.5px solid ${changed ? theme.colors.accent.primary : theme.colors.border[2]}`,
                color: theme.colors.text.primary, fontSize: theme.typography.sizes.sm,
                fontFamily: theme.typography.fonts.primary, width: "200px",
              }} />
            {changed && (
              <button onClick={() => onUpdate(setting.key, value)} disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                style={{ fontSize: "0.6rem", fontFamily: theme.typography.fonts.primary, background: theme.colors.accent.primary, color: theme.colors.bg.primary, minHeight: "28px" }}>
                Save
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function AdminSettingsPage() {
  const { settings, isLoading, updateSetting, isUpdating } = useAppSettings();
  const { clearCache, isClearingCache, broadcast, isBroadcasting } = useAdminActions();

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSev, setBroadcastSev] = useState("info");
  const [showBroadcast, setShowBroadcast] = useState(false);

  const handleBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;
    broadcast({ title: broadcastTitle, message: broadcastMsg, severity: broadcastSev });
    setBroadcastTitle(""); setBroadcastMsg(""); setShowBroadcast(false);
  };

  const toast = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (type: "users" | "predictions") => {
    if (!accessToken) {
      toast.error("Not authenticated. Please re-login.");
      return;
    }
    setIsExporting(type);
    try {
      const base = import.meta.env.VITE_API_URL || "";
      const url = `${base}/api/v1/admin/export/${type}?token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url);
      if (!res.ok) {
        toast.error(`Export failed: ${res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${type}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success(`${type === "users" ? "Users" : "Predictions"} CSV downloaded.`);
    } catch {
      toast.error("Export failed. Check your connection.");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <ErrorBoundary>
      <div className="animate-page-in">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>
            App Settings & Admin Tools
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle, marginTop: "4px" }}>
            Configure platform settings, manage cache, broadcast messages, and export data.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Clear Cache */}
          <button onClick={() => clearCache()} disabled={isClearingCache}
            className="p-5 rounded-2xl text-left transition-all hover:scale-[1.02] disabled:opacity-60"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${theme.colors.health.sleep.DEFAULT}15`, border: `1px solid ${theme.colors.health.sleep.DEFAULT}25` }}>
                <i className="fas fa-broom" style={{ color: theme.colors.health.sleep.DEFAULT }} />
              </div>
              <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Clear Cache</span>
            </div>
            <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>Flush all Redis cache entries</p>
          </button>

          {/* Broadcast */}
          <button onClick={() => setShowBroadcast(!showBroadcast)}
            className="p-5 rounded-2xl text-left transition-all hover:scale-[1.02]"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${theme.colors.health.warning.DEFAULT}15`, border: `1px solid ${theme.colors.health.warning.DEFAULT}25` }}>
                <i className="fas fa-bullhorn" style={{ color: theme.colors.health.warning.DEFAULT }} />
              </div>
              <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Broadcast</span>
            </div>
            <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>Send alert to all users</p>
          </button>

          {/* Export Users */}
          <button onClick={() => handleExport("users")} disabled={isExporting === "users"}
            className="p-5 rounded-2xl text-left transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-wait"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${theme.colors.accent.primary}15`, border: `1px solid ${theme.colors.accent.primary}25` }}>
                <i className={`fas ${isExporting === "users" ? "fa-spinner fa-spin" : "fa-file-csv"}`} style={{ color: theme.colors.accent.primary }} />
              </div>
              <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{isExporting === "users" ? "Downloading..." : "Export Users"}</span>
            </div>
            <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>Download CSV of all users</p>
          </button>

          {/* Export Predictions */}
          <button onClick={() => handleExport("predictions")} disabled={isExporting === "predictions"}
            className="p-5 rounded-2xl text-left transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-wait"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${theme.colors.health.recovery.DEFAULT}15`, border: `1px solid ${theme.colors.health.recovery.DEFAULT}25` }}>
                <i className={`fas ${isExporting === "predictions" ? "fa-spinner fa-spin" : "fa-file-csv"}`} style={{ color: theme.colors.health.recovery.DEFAULT }} />
              </div>
              <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{isExporting === "predictions" ? "Downloading..." : "Export Predictions"}</span>
            </div>
            <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>Download CSV of all predictions</p>
          </button>
        </div>

        {/* Broadcast Panel */}
        {showBroadcast && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-6 mb-6" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.health.warning.DEFAULT}30` }}>
            <div className="flex items-center gap-2 mb-4">
              <i className="fas fa-bullhorn" style={{ color: theme.colors.health.warning.DEFAULT }} />
              <h3 className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Broadcast Message to All Users</h3>
            </div>
            <div className="space-y-3">
              <input type="text" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Alert title..."
                className="w-full px-4 py-2.5 rounded-xl outline-none"
                style={{ background: theme.colors.surface[3], border: `1.5px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, fontSize: "16px", fontFamily: theme.typography.fonts.primary }}
              />
              <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Message body..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl outline-none resize-none"
                style={{ background: theme.colors.surface[3], border: `1.5px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, fontSize: "16px", fontFamily: theme.typography.fonts.primary }}
              />
              <div className="flex items-center gap-3">
                <select value={broadcastSev} onChange={(e) => setBroadcastSev(e.target.value)}
                  className="px-4 py-2.5 rounded-xl outline-none appearance-none cursor-pointer"
                  style={{ background: theme.colors.surface[3], border: `1.5px solid ${theme.colors.border[2]}`, color: theme.colors.text.primary, fontFamily: theme.typography.fonts.primary, fontSize: "16px" }}>
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastMsg.trim()}
                  className="px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  style={{ fontFamily: theme.typography.fonts.primary, fontSize: theme.typography.sizes.xxs, background: theme.colors.health.warning.DEFAULT, color: theme.colors.bg.primary, minHeight: "40px" }}>
                  {isBroadcasting ? "Sending..." : "Send Broadcast"}
                </button>
                <button onClick={() => setShowBroadcast(false)}
                  className="px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider"
                  style={{ fontFamily: theme.typography.fonts.primary, fontSize: theme.typography.sizes.xxs, background: theme.colors.surface[3], color: theme.colors.text.muted, minHeight: "40px" }}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Settings List */}
        <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}`, background: theme.colors.surface[3] }}>
            <div className="flex items-center gap-2">
              <i className="fas fa-sliders text-xs" style={{ color: theme.colors.health.warning.DEFAULT }} />
              <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Application Settings</span>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><SpinnerLoader size="lg" /></div>
          ) : settings.length === 0 ? (
            <div className="px-5 py-10 text-center" style={{ color: theme.colors.text.subtle }}>No settings configured.</div>
          ) : (
            settings.map((s) => (
              <SettingRow key={s.key} setting={s} onUpdate={updateSetting} isUpdating={isUpdating} />
            ))
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
