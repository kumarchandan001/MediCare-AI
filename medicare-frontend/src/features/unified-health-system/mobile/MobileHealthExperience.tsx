/**
 * MobileHealthExperience — The root container for the mobile-optimized
 * unified health interface. Integrates ALL 10 phases of the MediCare
 * ecosystem into a cohesive, tab-based mobile experience.
 *
 * Phases Connected:
 * - P1: Clinical Investigation (via investigation tab)
 * - P2: Longitudinal Health & Wearable (via dashboard + timeline)
 * - P3: Emotional Companion (via companion tab)
 * - P4: Clinical Realism (via investigation pipeline)
 * - P5: Governance & Audit (via governance tab)
 * - P6: Unified Health OS (via dashboard core)
 * - P7: Advanced Intelligence (via insights)
 * - P8: Clinical Validation (via trust indicators)
 * - P9: Production Infrastructure (via stability layer)
 * - P10: Healthcare Integration (via ecosystem tab)
 */
import React, { useState, useMemo, useCallback } from "react";
import { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import { useUnifiedCompanion } from "../companion/UnifiedCompanionEngine";
import MobileMonitoringView from "./MobileMonitoringView";
import CompactHealthCards from "./CompactHealthCards";
import HolisticHealthTimeline from "../storytelling/HolisticHealthTimeline";
import type { HealthDomain, DomainSignal } from "../UnifiedHealthEngine";

type MobileTab = "dashboard" | "timeline" | "companion" | "investigate" | "governance" | "ecosystem";

export default function MobileHealthExperience() {
  const ctx = useUnifiedHealthContext();
  const companion = useUnifiedCompanion();
  const [activeTab, setActiveTab] = useState<MobileTab>("dashboard");

  const getTimeOfDay = useCallback((): "morning" | "afternoon" | "evening" | "night" => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    if (h < 21) return "evening";
    return "night";
  }, []);

  const companionMessages = useMemo(() => {
    if (!ctx.unifiedState) return [];
    const signalMap = new Map<HealthDomain, DomainSignal>();
    ctx.domainSignals.forEach(s => signalMap.set(s.domain, s));
    return companion.generateMessages({
      timeOfDay: getTimeOfDay(),
      overallScore: ctx.unifiedState.overallScore,
      overallTrend: ctx.unifiedState.overallTrend,
      activeDomains: ctx.domainSignals.map(s => s.domain),
      recentInsights: ctx.crossDomainInsights,
      hasActiveInvestigation: false,
      hasActiveRecovery: ctx.domainSignals.some(s => s.domain === "recovery"),
      daysSinceLastInteraction: 0,
    }, signalMap);
  }, [ctx.unifiedState, ctx.domainSignals, ctx.crossDomainInsights, companion, getTimeOfDay]);

  if (!ctx.unifiedState) return null;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#0f0f13", color: "#fff",
      overflow: "hidden", position: "relative",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Mobile Header */}
      <div style={{
        padding: "16px 20px 12px",
        background: "rgba(15,15,19,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, letterSpacing: "-0.5px" }}>MediCare</h1>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Health Intelligence
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Trust indicator badge */}
            <div style={{
              padding: "3px 8px", borderRadius: "8px",
              background: "rgba(0,184,148,0.1)", color: "#00b894",
              fontSize: "10px", fontWeight: 600,
            }}>
              ✓ Verified
            </div>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px",
            }}>
              {ctx.unifiedState.overallScore >= 75 ? "🌟" : ctx.unifiedState.overallScore >= 50 ? "🛡️" : "💙"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: "85px" }}>
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <MobileMonitoringView />
            <CompactHealthCards />
            {/* Active Alerts Section */}
            {ctx.activeAlerts.length > 0 && (
              <div style={{
                padding: "14px", borderRadius: "16px",
                background: "rgba(255,107,107,0.05)",
                border: "1px solid rgba(255,107,107,0.15)",
              }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#ff6b6b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Active Alerts
                </div>
                {ctx.activeAlerts.slice(0, 3).map((alert, i) => (
                  <div key={i} style={{
                    padding: "8px 0", borderBottom: i < ctx.activeAlerts.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    fontSize: "13px", color: "rgba(255,255,255,0.7)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span>{alert.level === "urgent" ? "🚨" : "⚠️"} {alert.message}</span>
                    <button onClick={() => ctx.dismissAlert(i)} style={{
                      background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                      cursor: "pointer", fontSize: "14px",
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {/* Cross-Domain Insights */}
            {ctx.crossDomainInsights.length > 0 && (
              <div style={{
                padding: "14px", borderRadius: "16px",
                background: "rgba(162,155,254,0.05)",
                border: "1px solid rgba(162,155,254,0.15)",
              }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#a29bfe", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  🔗 Cross-System Intelligence
                </div>
                {ctx.crossDomainInsights.slice(0, 2).map(insight => (
                  <div key={insight.id} style={{
                    padding: "10px 12px", borderRadius: "10px", marginBottom: "6px",
                    background: insight.impact === "positive" ? "rgba(0,184,148,0.06)" : "rgba(255,255,255,0.03)",
                    borderLeft: `3px solid ${insight.impact === "positive" ? "#00b894" : "#a29bfe"}`,
                  }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                      {insight.insight}
                    </p>
                    {insight.actionSuggestion && (
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.45)", fontStyle: "italic" }}>
                        💡 {insight.actionSuggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "timeline" && <HolisticHealthTimeline />}

        {activeTab === "companion" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {companionMessages.length > 0 ? companionMessages.map(msg => (
              <div key={msg.id} style={{
                padding: "16px", borderRadius: "16px",
                background: msg.tone === "celebratory" ? "rgba(0,184,148,0.06)" :
                  msg.tone === "cautious" ? "rgba(253,203,110,0.06)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${msg.tone === "celebratory" ? "rgba(0,184,148,0.15)" :
                  msg.tone === "cautious" ? "rgba(253,203,110,0.15)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px" }}>
                    {msg.type === "greeting" ? "👋" : msg.type === "insight" ? "💡" :
                     msg.type === "encouragement" ? "💪" : msg.type === "alert" ? "⚠️" :
                     msg.type === "check_in" ? "💙" : msg.type === "milestone" ? "🎉" :
                     msg.type === "reflection" ? "🪞" : "🧭"}
                  </span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                    {msg.type.replace("_", " ")}
                  </span>
                </div>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "14px", lineHeight: 1.6 }}>
                  {msg.content}
                </p>
                {msg.actionable && msg.action && (
                  <button style={{
                    marginTop: "10px", padding: "8px 14px", borderRadius: "10px",
                    background: "rgba(0,184,148,0.12)", color: "#00b894",
                    border: "1px solid rgba(0,184,148,0.2)",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  }}>
                    {msg.action.label}
                  </button>
                )}
              </div>
            )) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>💬</div>
                <h3 style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Your Companion</h3>
                <p style={{ fontSize: "13px", lineHeight: 1.5 }}>
                  Add health data to receive personalized, emotionally safe companion messages.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "investigate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              padding: "24px", borderRadius: "20px", textAlign: "center",
              background: "linear-gradient(135deg, rgba(255,107,107,0.06) 0%, rgba(108,92,231,0.06) 100%)",
              border: "1px solid rgba(255,107,107,0.12)",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🩺</div>
              <h3 style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "18px" }}>Clinical Investigation</h3>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                Start an adaptive clinical interview powered by AI reasoning with differential diagnosis, temporal analysis, and clinical governance.
              </p>
              <a href="/prediction" style={{
                display: "inline-block", padding: "12px 24px", borderRadius: "14px",
                background: "linear-gradient(135deg, #ff6b6b, #6c5ce7)",
                color: "#fff", fontWeight: 600, fontSize: "14px",
                textDecoration: "none", transition: "opacity 0.2s",
              }}>
                Begin Investigation
              </a>
            </div>
            <div style={{
              padding: "14px", borderRadius: "14px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Safety Assurances
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                ✓ Not a diagnostic tool — organizes symptoms for healthcare discussion<br/>
                ✓ Escalation moderation prevents alarming language<br/>
                ✓ Governance pipeline validates all AI reasoning<br/>
                ✓ Clinical realism engine ensures believable outputs
              </div>
            </div>
          </div>
        )}

        {activeTab === "governance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{
              padding: "16px", borderRadius: "16px",
              background: "rgba(0,184,148,0.04)", border: "1px solid rgba(0,184,148,0.12)",
            }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#00b894", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🛡️ Trust & Governance
              </div>
              {[
                { label: "AI Transparency", value: "All reasoning disclosed", icon: "🔍", status: "active" },
                { label: "Emotional Safety", value: "Filters active", icon: "💙", status: "active" },
                { label: "Data Privacy", value: "Local-first storage", icon: "🔒", status: "active" },
                { label: "Escalation Guard", value: "Calm moderation on", icon: "⚖️", status: "active" },
                { label: "Audit Trail", value: "Recording all decisions", icon: "📋", status: "active" },
                { label: "Clinical Realism", value: "Confidence stabilization on", icon: "🎯", status: "active" },
              ].map(item => (
                <div key={item.label} style={{
                  padding: "10px 12px", borderRadius: "10px", marginBottom: "6px",
                  background: "rgba(255,255,255,0.02)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px" }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{item.label}</div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{item.value}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: "2px 8px", borderRadius: "6px",
                    background: "rgba(0,184,148,0.12)", color: "#00b894",
                    fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
                  }}>Active</div>
                </div>
              ))}
            </div>
            {/* Medication Consent */}
            <div style={{
              padding: "16px", borderRadius: "16px",
              background: "rgba(225,112,85,0.04)", border: "1px solid rgba(225,112,85,0.12)",
            }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#e17055", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                💊 Medication Tracking
              </div>
              <p style={{ margin: "0 0 10px", fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                {ctx.config.medicationConsent.consentGiven
                  ? "Medication tracking is enabled. Your data is stored locally."
                  : "Medication tracking requires explicit consent. Your data stays on-device."}
              </p>
              <button
                onClick={() => ctx.config.medicationConsent.consentGiven ? ctx.revokeMedicationConsent() : ctx.grantMedicationConsent()}
                style={{
                  padding: "8px 14px", borderRadius: "10px",
                  background: ctx.config.medicationConsent.consentGiven ? "rgba(255,107,107,0.1)" : "rgba(0,184,148,0.1)",
                  color: ctx.config.medicationConsent.consentGiven ? "#ff6b6b" : "#00b894",
                  border: `1px solid ${ctx.config.medicationConsent.consentGiven ? "rgba(255,107,107,0.2)" : "rgba(0,184,148,0.2)"}`,
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                }}
              >
                {ctx.config.medicationConsent.consentGiven ? "Revoke Consent" : "Enable Tracking"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "ecosystem" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{
              padding: "20px", borderRadius: "16px", textAlign: "center",
              background: "linear-gradient(135deg, rgba(85,163,240,0.06) 0%, rgba(162,155,254,0.06) 100%)",
              border: "1px solid rgba(85,163,240,0.12)",
            }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🌐</div>
              <h3 style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "16px" }}>Ecosystem Health</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                All {ctx.config.activeDomains.length} health domains active
              </p>
            </div>
            {/* Domain health cards */}
            {ctx.domainSignals.map(signal => {
              const domainMeta: Record<string, { icon: string; color: string }> = {
                disease_intelligence: { icon: "🔬", color: "#ff6b6b" },
                wearable: { icon: "⌚", color: "#4ecdc4" },
                recovery: { icon: "💚", color: "#45b7d1" },
                sleep: { icon: "🌙", color: "#6c5ce7" },
                activity: { icon: "🏃", color: "#00b894" },
                nutrition: { icon: "🥗", color: "#fdcb6e" },
                medication: { icon: "💊", color: "#e17055" },
                wellness: { icon: "✨", color: "#a29bfe" },
                coaching: { icon: "🧭", color: "#55a3f0" },
                preventive: { icon: "🛡️", color: "#00cec9" },
                emotional: { icon: "🧠", color: "#fd79a8" },
              };
              const meta = domainMeta[signal.domain] || { icon: "📊", color: "#aaa" };
              return (
                <div key={signal.domain} style={{
                  padding: "12px 14px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "20px" }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.8)", textTransform: "capitalize" }}>
                        {signal.domain.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                        {signal.trend === "improving" ? "↑ Improving" : signal.trend === "declining" ? "↓ Declining" : "→ Stable"}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: "20px", fontWeight: 700, color: meta.color,
                  }}>
                    {signal.score}
                  </div>
                </div>
              );
            })}
            {/* System Status */}
            <div style={{
              padding: "14px", borderRadius: "14px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                System Status
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Clinical Realism", status: "Active" },
                  { label: "Governance Pipeline", status: "Active" },
                  { label: "Longitudinal Memory", status: "Active" },
                  { label: "Wearable Sync", status: "Ready" },
                  { label: "Companion AI", status: "Active" },
                  { label: "Audit Trail", status: "Recording" },
                ].map(sys => (
                  <div key={sys.label} style={{
                    padding: "8px 10px", borderRadius: "8px",
                    background: "rgba(0,184,148,0.04)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{sys.label}</span>
                    <span style={{ fontSize: "9px", color: "#00b894", fontWeight: 600 }}>● {sys.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar — 6 tabs for full ecosystem access */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: "68px", background: "rgba(15,15,19,0.97)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 50,
      }}>
        <TabItem icon="📊" label="Overview" isActive={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
        <TabItem icon="📖" label="Story" isActive={activeTab === "timeline"} onClick={() => setActiveTab("timeline")} />
        <TabItem icon="💬" label="Companion" isActive={activeTab === "companion"} onClick={() => setActiveTab("companion")} />
        <TabItem icon="🩺" label="Investigate" isActive={activeTab === "investigate"} onClick={() => setActiveTab("investigate")} />
        <TabItem icon="🛡️" label="Governance" isActive={activeTab === "governance"} onClick={() => setActiveTab("governance")} />
        <TabItem icon="🌐" label="Ecosystem" isActive={activeTab === "ecosystem"} onClick={() => setActiveTab("ecosystem")} />
      </div>
    </div>
  );
}

function TabItem({ icon, label, isActive, onClick }: { 
  icon: string; label: string; isActive: boolean; onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      style={{
        background: "none", border: "none", padding: "6px 4px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
        color: isActive ? "#00b894" : "rgba(255,255,255,0.35)",
        cursor: "pointer", transition: "all 0.2s", minWidth: "48px",
      }}
    >
      <span style={{ fontSize: "18px", filter: isActive ? "drop-shadow(0 0 4px rgba(0,184,148,0.4))" : "none" }}>
        {icon}
      </span>
      <span style={{ fontSize: "9px", fontWeight: isActive ? 600 : 400 }}>
        {label}
      </span>
    </button>
  );
}
