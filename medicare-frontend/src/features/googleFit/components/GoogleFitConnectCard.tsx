import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import {
  useGoogleFitStatus,
  useGoogleFitConnect,
  useGoogleFitSync,
  useGoogleFitHistory,
} from "../hooks/useGoogleFit";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";

// ── Google "G" logo SVG ───────────────────
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── Not connected: connect card ───────────
function ConnectCard({
  onConnect,
  isConnecting,
}: {
  onConnect: () => void;
  isConnecting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[2],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      <div
        className="h-1 w-full"
        style={{
          background: "linear-gradient(90deg, #4285F4, #34A853, #FBBC05, #EA4335)",
        }}
      />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #4285F420, #EA433520)",
              border: "1px solid rgba(66,133,244,0.2)",
            }}
          >
            <GoogleLogo size={28} />
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
              Google Fit
            </h3>
            <p
              style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.subtle,
                marginTop: "2px",
              }}
            >
              Auto-sync health data from your phone and wearables
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { icon: "fa-shoe-prints", label: "Steps & Distance", color: "#4285F4" },
            { icon: "fa-heart", label: "Heart Rate", color: "#EA4335" },
            { icon: "fa-moon", label: "Sleep Tracking", color: "#9C6FFF" },
            { icon: "fa-fire", label: "Calories Burned", color: "#FBBC05" },
            { icon: "fa-weight-scale", label: "Weight & BMI", color: "#34A853" },
            { icon: "fa-droplet", label: "Blood Oxygen & More", color: "#00B4FF" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: theme.colors.surface[3],
                border: `1px solid ${theme.colors.border[1]}`,
              }}
            >
              <i className={`fas ${item.icon} text-xs`} style={{ color: item.color }} />
              <span
                style={{
                  fontSize: theme.typography.sizes.xxs,
                  color: theme.colors.text.muted,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all disabled:opacity-60"
          style={{
            background: "white",
            color: "#3c4043",
            fontFamily: theme.typography.fonts.primary,
            fontSize: theme.typography.sizes.sm,
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            minHeight: "52px",
          }}
        >
          {isConnecting ? <SpinnerLoader size="sm" /> : <><GoogleLogo size={20} /> Sign in with Google</>}
        </button>

        <p
          className="text-center mt-3"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
        >
          Read-only access · No data is sent to Google
        </p>
      </div>
    </motion.div>
  );
}

// ── Connected: manage card ────────────────
function ConnectedCard({
  status,
  onSync,
  isSyncing,
  onToggleAutoSync,
  onDisconnect,
  isDisconnecting,
  history,
}: {
  status: { connected: boolean; last_sync: string | null; auto_sync: boolean };
  onSync: (days: number) => void;
  isSyncing: boolean;
  onToggleAutoSync: (v: boolean) => void;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  history: { id: number; sync_type: string; status: string; started_at: string; vitals: number; total_steps: number }[];
}) {
  const lastSync = status.last_sync ? new Date(status.last_sync) : null;
  const lastSyncText = lastSync
    ? lastSync.toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      <div className="h-1" style={{ background: "linear-gradient(90deg, #4285F4, #34A853, #FBBC05, #EA4335)" }} />
      <div className="p-6">
        {/* Status header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4285F420, #34A85320)",
                border: "1px solid rgba(52,168,83,0.2)",
              }}
            >
              <GoogleLogo size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-black"
                  style={{ fontSize: theme.typography.sizes.base, color: theme.colors.text.primary, letterSpacing: "-0.02em" }}
                >
                  Google Fit
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ fontSize: "0.6rem", background: theme.colors.health.recovery.bg, color: theme.colors.health.recovery.DEFAULT }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.health.recovery.DEFAULT }} />
                  Connected
                </span>
              </div>
              <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, marginTop: "2px" }}>
                Last synced: {lastSyncText}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => onSync(1)}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            style={{
              fontSize: theme.typography.sizes.xxs,
              fontFamily: theme.typography.fonts.primary,
              background: theme.colors.accent.subtle,
              color: theme.colors.accent.primary,
              border: `1px solid ${theme.colors.accent.border}`,
              minHeight: "44px",
            }}
          >
            {isSyncing ? <SpinnerLoader size="sm" /> : <i className="fas fa-rotate-right text-xs" />}
            {isSyncing ? "Syncing..." : "Sync Today"}
          </button>
          <button
            onClick={() => onSync(7)}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            style={{
              fontSize: theme.typography.sizes.xxs,
              fontFamily: theme.typography.fonts.primary,
              background: theme.colors.surface[3],
              color: theme.colors.text.muted,
              minHeight: "44px",
            }}
          >
            <i className="fas fa-calendar-week text-xs" />
            Sync 7 Days
          </button>
        </div>

        {/* Auto-sync toggle */}
        <div
          className="flex items-center justify-between p-4 rounded-xl mb-4"
          style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
        >
          <div>
            <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary, fontWeight: 600 }}>
              Auto-Sync
            </div>
            <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, marginTop: "2px" }}>
              Syncs automatically every 6 hours
            </div>
          </div>
          <button
            onClick={() => onToggleAutoSync(!status.auto_sync)}
            className="relative rounded-full transition-all flex-shrink-0"
            style={{
              width: "48px",
              height: "28px",
              minWidth: "48px",
              background: status.auto_sync ? theme.colors.accent.primary : theme.colors.surface[4],
              border: `1px solid ${status.auto_sync ? theme.colors.accent.border : theme.colors.border[2]}`,
            }}
          >
            <span
              className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all"
              style={{
                left: status.auto_sync ? "calc(100% - 26px)" : "2px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          </button>
        </div>

        {/* Recent sync history */}
        {history.length > 0 && (
          <div className="mb-4">
            <div
              className="font-bold uppercase tracking-widest mb-2"
              style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
            >
              Recent Syncs
            </div>
            <div className="space-y-2">
              {history.slice(0, 3).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
                >
                  <div className="flex items-center gap-2">
                    <i
                      className={`fas fa-${h.status === "success" ? "circle-check" : "circle-xmark"} text-xs`}
                      style={{
                        color: h.status === "success" ? theme.colors.health.recovery.DEFAULT : theme.colors.health.danger.DEFAULT,
                      }}
                    />
                    <span style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.muted }}>
                      {new Date(h.started_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
                    {h.vitals > 0 && `${h.vitals}v `}
                    {h.total_steps > 0 && `${h.total_steps.toLocaleString()} steps`}
                    {h.status === "failed" && (
                      <span style={{ color: theme.colors.health.danger.DEFAULT }}>Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disconnect */}
        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          style={{
            fontSize: theme.typography.sizes.xxs,
            fontFamily: theme.typography.fonts.primary,
            background: "transparent",
            color: theme.colors.health.danger.DEFAULT,
            border: `1px solid ${theme.colors.health.danger.border}`,
          }}
        >
          <i className="fas fa-link-slash mr-2 text-xs" />
          Disconnect Google Fit
        </button>
      </div>
    </motion.div>
  );
}

// ── Main export ───────────────────────────
export default function GoogleFitConnectCard() {
  const { data: status, isLoading } = useGoogleFitStatus();
  const { connect, isConnecting } = useGoogleFitConnect();
  const { sync, isSyncing, toggleAutoSync, disconnect, isDisconnecting } = useGoogleFitSync();
  const { data: historyData } = useGoogleFitHistory();

  if (isLoading) {
    return (
      <div
        className="rounded-2xl p-8 flex items-center justify-center"
        style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
      >
        <SpinnerLoader size="lg" />
      </div>
    );
  }

  if (!status?.connected) {
    return <ConnectCard onConnect={connect} isConnecting={isConnecting} />;
  }

  return (
    <ConnectedCard
      status={status}
      onSync={sync}
      isSyncing={isSyncing}
      onToggleAutoSync={toggleAutoSync}
      onDisconnect={disconnect}
      isDisconnecting={isDisconnecting}
      history={historyData?.history || []}
    />
  );
}
