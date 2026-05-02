import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";
import {
  useAdminUserDetail,
  useAdminUserHealth,
  useAdminUserActions,
  useAdminActions,
} from "../hooks/useAdmin";

type TabKey = "overview" | "vitals" | "predictions" | "alerts" | "medications";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = Number(id);

  const { data: user, isLoading: userLoading } = useAdminUserDetail(userId);
  const { data: health, isLoading: healthLoading } = useAdminUserHealth(userId);
  const { updateUser, deleteUser, isUpdating, isDeleting } = useAdminUserActions();
  const { promoteUser, demoteUser, resetPassword, isPromoting, isDemoting, isResetting } = useAdminActions();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: "overview", label: "Overview", icon: "fa-user" },
    { key: "vitals", label: "Vitals", icon: "fa-heart-pulse" },
    { key: "predictions", label: "Predictions", icon: "fa-stethoscope" },
    { key: "alerts", label: "Alerts", icon: "fa-bell" },
    { key: "medications", label: "Medications", icon: "fa-pills" },
  ];

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <SpinnerLoader size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20" style={{ color: theme.colors.text.subtle }}>
        User not found.
      </div>
    );
  }

  const riskColor =
    health?.risk_level === "Critical" ? theme.colors.health.danger.DEFAULT
    : health?.risk_level === "High" ? "#FF6D00"
    : health?.risk_level === "Moderate" ? theme.colors.health.warning.DEFAULT
    : theme.colors.health.recovery.DEFAULT;

  return (
    <ErrorBoundary>
      <div className="animate-page-in">

        {/* Back button */}
        <button
          onClick={() => navigate("/admin/users")}
          className="flex items-center gap-2 mb-6 font-bold uppercase tracking-wider transition-colors"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, background: "transparent", fontFamily: theme.typography.fonts.primary }}
        >
          <i className="fas fa-arrow-left text-xs" />
          Back to Users
        </button>

        {/* User Header Card */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            {/* Avatar + Info */}
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center font-black flex-shrink-0 text-3xl"
                style={{
                  background: user.is_admin ? `${theme.colors.health.warning.DEFAULT}20` : theme.colors.accent.subtle,
                  color: user.is_admin ? theme.colors.health.warning.DEFAULT : theme.colors.accent.primary,
                  border: `2px solid ${user.is_admin ? `${theme.colors.health.warning.DEFAULT}30` : theme.colors.accent.border}`,
                }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="font-black tracking-tight" style={{ fontSize: theme.typography.sizes.h1, color: theme.colors.text.primary, letterSpacing: "-0.03em" }}>
                    {user.username}
                  </h1>
                  {user.is_admin && (
                    <span className="px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ fontSize: theme.typography.sizes.xxs, background: `${theme.colors.health.warning.DEFAULT}15`, color: theme.colors.health.warning.DEFAULT, border: `1px solid ${theme.colors.health.warning.DEFAULT}25` }}>
                      Admin
                    </span>
                  )}
                  {!user.is_active && (
                    <span className="px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ fontSize: theme.typography.sizes.xxs, background: theme.colors.health.danger.bg, color: theme.colors.health.danger.DEFAULT }}>
                      Inactive
                    </span>
                  )}
                  {user.account_locked && (
                    <span className="px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ fontSize: theme.typography.sizes.xxs, background: theme.colors.health.danger.bg, color: theme.colors.health.danger.DEFAULT }}>
                      Locked
                    </span>
                  )}
                </div>
                <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.subtle }}>{user.email}</div>
                <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle, marginTop: "4px" }}>
                  Joined {new Date(user.created_at).toLocaleDateString("en-IN")}
                  {user.last_login_at && <> · Last login {new Date(user.last_login_at).toLocaleDateString("en-IN")}</>}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateUser(user.id, { is_active: !user.is_active })} disabled={isUpdating}
                className="px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, minHeight: "36px",
                  background: user.is_active ? theme.colors.health.warning.bg : theme.colors.health.recovery.bg,
                  color: user.is_active ? theme.colors.health.warning.DEFAULT : theme.colors.health.recovery.DEFAULT,
                }}>
                <i className={`fas fa-${user.is_active ? "ban" : "check"} mr-1`} />
                {user.is_active ? "Deactivate" : "Activate"}
              </button>

              <button onClick={() => updateUser(user.id, { account_locked: !user.account_locked })} disabled={isUpdating}
                className="px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, minHeight: "36px",
                  background: user.account_locked ? theme.colors.health.recovery.bg : theme.colors.health.danger.bg,
                  color: user.account_locked ? theme.colors.health.recovery.DEFAULT : theme.colors.health.danger.DEFAULT,
                }}>
                <i className={`fas fa-${user.account_locked ? "unlock" : "lock"} mr-1`} />
                {user.account_locked ? "Unlock" : "Lock"}
              </button>

              <button onClick={() => user.is_admin ? demoteUser(user.id) : promoteUser(user.id)} disabled={isPromoting || isDemoting}
                className="px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, minHeight: "36px",
                  background: user.is_admin ? theme.colors.surface[4] : `${theme.colors.health.warning.DEFAULT}15`,
                  color: user.is_admin ? theme.colors.text.muted : theme.colors.health.warning.DEFAULT,
                }}>
                <i className={`fas fa-${user.is_admin ? "user-minus" : "user-shield"} mr-1`} />
                {user.is_admin ? "Demote Admin" : "Make Admin"}
              </button>

              <button onClick={() => resetPassword(user.id)} disabled={isResetting}
                className="px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, minHeight: "36px", background: theme.colors.surface[3], color: theme.colors.text.muted }}>
                <i className="fas fa-key mr-1" />
                Reset Password
              </button>

              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all"
                  style={{ fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary, minHeight: "36px",
                    background: theme.colors.health.danger.bg, color: theme.colors.health.danger.DEFAULT, border: `1px solid ${theme.colors.health.danger.border}`,
                  }}>
                  <i className="fas fa-trash-can mr-1" />
                  Delete
                </button>
              ) : (
                <div className="flex gap-2 items-center px-4 py-2 rounded-xl" style={{ background: theme.colors.health.danger.bg, border: `1px solid ${theme.colors.health.danger.border}` }}>
                  <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.health.danger.DEFAULT }}>Delete {user.username}?</span>
                  <button onClick={() => { deleteUser(user.id); navigate("/admin/users"); }} disabled={isDeleting}
                    className="px-3 py-1 rounded-lg font-bold text-xs" style={{ background: theme.colors.health.danger.DEFAULT, color: "#fff", fontFamily: theme.typography.fonts.primary }}>Yes</button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 rounded-lg font-bold text-xs" style={{ background: theme.colors.surface[4], color: theme.colors.text.muted, fontFamily: theme.typography.fonts.primary }}>No</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Health Stats Row */}
        {!healthLoading && health && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Vitals", value: health.vitals_count, color: theme.colors.health.danger.DEFAULT, icon: "fa-heart-pulse" },
              { label: "Predictions", value: health.predictions_count, color: theme.colors.accent.primary, icon: "fa-stethoscope" },
              { label: "Medications", value: health.medications_count, color: theme.colors.health.sleep.DEFAULT, icon: "fa-pills" },
              { label: "Alerts", value: health.alerts_count, color: theme.colors.health.warning.DEFAULT, icon: "fa-bell" },
              { label: "Avg Sleep", value: `${health.avg_sleep}h`, color: theme.colors.health.sleep.DEFAULT, icon: "fa-moon" },
              { label: "Risk Level", value: health.risk_level || "Low", color: riskColor, icon: "fa-shield-halved" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold uppercase tracking-widest" style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>{s.label}</span>
                  <i className={`fas ${s.icon} text-xs`} style={{ color: s.color }} />
                </div>
                <div className="font-black" style={{ fontSize: theme.typography.sizes.h2, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1.5 rounded-2xl overflow-x-auto mb-6" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0 font-bold uppercase tracking-wider transition-colors"
              style={{
                fontSize: theme.typography.sizes.xxs, fontFamily: theme.typography.fonts.primary,
                background: activeTab === tab.key ? theme.colors.accent.primary : "transparent",
                color: activeTab === tab.key ? theme.colors.bg.primary : theme.colors.text.subtle,
              }}>
              <i className={`fas ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Overview */}
        {activeTab === "overview" && health && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent Predictions */}
            <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
                <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Recent Predictions</span>
              </div>
              <div className="p-4 space-y-3">
                {health.recent_predictions.length === 0 ? (
                  <p style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.sm }}>No predictions yet.</p>
                ) : health.recent_predictions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}>
                    <div>
                      <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary, fontWeight: 600 }}>{p.disease}</div>
                      <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{p.date}</div>
                    </div>
                    <span className="font-black" style={{
                      fontSize: theme.typography.sizes.base,
                      color: p.conf >= 80 ? theme.colors.health.recovery.DEFAULT : p.conf >= 60 ? theme.colors.health.warning.DEFAULT : theme.colors.health.danger.DEFAULT,
                    }}>{p.conf}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Vitals */}
            <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
                <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Recent Vitals</span>
              </div>
              <div className="p-4">
                {health.recent_vitals.length === 0 ? (
                  <p style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.sm }}>No vitals logged.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ fontSize: theme.typography.sizes.xs }}>
                      <thead>
                        <tr style={{ color: theme.colors.text.subtle }}>
                          {["Date", "Sleep", "HR", "SpO2", "Stress"].map(h => (
                            <th key={h} className="text-left pb-2 font-bold uppercase tracking-wider pr-3" style={{ fontSize: "0.6rem" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {health.recent_vitals.map((v, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
                            <td className="py-2 pr-3" style={{ color: theme.colors.text.subtle }}>{v.date}</td>
                            <td className="py-2 pr-3 font-semibold" style={{ color: theme.colors.health.sleep.DEFAULT }}>{v.sleep ? `${v.sleep}h` : "—"}</td>
                            <td className="py-2 pr-3 font-semibold" style={{ color: theme.colors.health.danger.DEFAULT }}>{v.hr || "—"}</td>
                            <td className="py-2 pr-3 font-semibold" style={{ color: theme.colors.health.strain.DEFAULT }}>{v.o2 ? `${v.o2}%` : "—"}</td>
                            <td className="py-2 font-semibold" style={{ color: theme.colors.health.warning.DEFAULT }}>{v.stress ? `${v.stress}/10` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Medications */}
            <div className="rounded-2xl overflow-hidden lg:col-span-2" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
                <span className="font-bold uppercase tracking-widest" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>Medications</span>
              </div>
              <div className="p-4">
                {health.medications.length === 0 ? (
                  <p style={{ color: theme.colors.text.subtle, fontSize: theme.typography.sizes.sm }}>No medications.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {health.medications.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{
                        background: m.is_active ? theme.colors.accent.subtle : theme.colors.surface[3],
                        border: `1px solid ${m.is_active ? theme.colors.accent.border : theme.colors.border[1]}`,
                      }}>
                        <i className="fas fa-pills text-xs" style={{ color: m.is_active ? theme.colors.accent.primary : theme.colors.text.subtle }} />
                        <span style={{ fontSize: theme.typography.sizes.xs, color: m.is_active ? theme.colors.text.primary : theme.colors.text.subtle }}>
                          {m.name}{m.dosage && ` · ${m.dosage}`}
                        </span>
                        {!m.is_active && <span style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}>(paused)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Vitals */}
        {activeTab === "vitals" && health && (
          <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="p-5">
              {health.recent_vitals.length === 0 ? (
                <p style={{ color: theme.colors.text.subtle }}>No vitals recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ fontSize: theme.typography.sizes.sm }}>
                    <thead>
                      <tr style={{ color: theme.colors.text.subtle }}>
                        {["Date", "Sleep", "Heart Rate", "SpO2", "Stress"].map(h => (
                          <th key={h} className="text-left pb-3 font-bold uppercase tracking-wider" style={{ fontSize: theme.typography.sizes.xxs }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {health.recent_vitals.map((v, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}>
                          <td className="py-3 pr-4" style={{ color: theme.colors.text.subtle }}>{v.date}</td>
                          <td className="py-3 pr-4 font-bold" style={{ color: theme.colors.health.sleep.DEFAULT }}>{v.sleep ? `${v.sleep}h` : "—"}</td>
                          <td className="py-3 pr-4 font-bold" style={{ color: theme.colors.health.danger.DEFAULT }}>{v.hr ? `${v.hr} bpm` : "—"}</td>
                          <td className="py-3 pr-4 font-bold" style={{ color: theme.colors.health.strain.DEFAULT }}>{v.o2 ? `${v.o2}%` : "—"}</td>
                          <td className="py-3 font-bold" style={{ color: theme.colors.health.warning.DEFAULT }}>{v.stress ? `${v.stress}/10` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Predictions */}
        {activeTab === "predictions" && health && (
          <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="p-5 space-y-3">
              {health.recent_predictions.length === 0 ? (
                <p style={{ color: theme.colors.text.subtle }}>No predictions.</p>
              ) : health.recent_predictions.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}>
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: theme.colors.text.primary, fontSize: theme.typography.sizes.base }}>{p.disease}</div>
                    <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle, marginTop: "4px" }}>{p.symptoms}</div>
                    <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle, marginTop: "2px" }}>{p.date}</div>
                  </div>
                  <span className="font-black ml-4" style={{
                    fontSize: theme.typography.sizes.h2,
                    color: p.conf >= 80 ? theme.colors.health.recovery.DEFAULT : p.conf >= 60 ? theme.colors.health.warning.DEFAULT : theme.colors.health.danger.DEFAULT,
                  }}>{p.conf}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Alerts */}
        {activeTab === "alerts" && health && (
          <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="p-5 space-y-3">
              {health.recent_alerts.length === 0 ? (
                <p style={{ color: theme.colors.text.subtle }}>No alerts.</p>
              ) : health.recent_alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl" style={{
                  background: a.severity === "critical" ? theme.colors.health.danger.bg : a.severity === "high" ? theme.colors.health.warning.bg : theme.colors.surface[3],
                  border: `1px solid ${a.severity === "critical" ? theme.colors.health.danger.border : a.severity === "high" ? theme.colors.health.warning.border : theme.colors.border[1]}`,
                }}>
                  <div>
                    <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary, fontWeight: 600 }}>{a.title}</span>
                    <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{a.date} · {a.is_read ? "Read" : "Unread"}</div>
                  </div>
                  <span className="px-2 py-1 rounded-full font-bold uppercase tracking-wider" style={{
                    fontSize: "0.6rem",
                    background: a.severity === "critical" ? theme.colors.health.danger.bg : theme.colors.health.warning.bg,
                    color: a.severity === "critical" ? theme.colors.health.danger.DEFAULT : theme.colors.health.warning.DEFAULT,
                  }}>{a.severity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Medications */}
        {activeTab === "medications" && health && (
          <div className="rounded-2xl overflow-hidden" style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}>
            <div className="p-5">
              {health.medications.length === 0 ? (
                <p style={{ color: theme.colors.text.subtle }}>No medications.</p>
              ) : (
                <div className="space-y-3">
                  {health.medications.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{
                      background: m.is_active ? theme.colors.accent.subtle : theme.colors.surface[3],
                      border: `1px solid ${m.is_active ? theme.colors.accent.border : theme.colors.border[1]}`,
                    }}>
                      <div className="flex items-center gap-3">
                        <i className="fas fa-pills" style={{ color: m.is_active ? theme.colors.accent.primary : theme.colors.text.subtle }} />
                        <div>
                          <div className="font-semibold" style={{ color: theme.colors.text.primary }}>{m.name}</div>
                          <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>{m.dosage} · {m.frequency}</div>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full font-bold uppercase tracking-wider" style={{
                        fontSize: "0.6rem",
                        background: m.is_active ? theme.colors.health.recovery.bg : theme.colors.surface[4],
                        color: m.is_active ? theme.colors.health.recovery.DEFAULT : theme.colors.text.subtle,
                      }}>{m.is_active ? "Active" : "Paused"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}
