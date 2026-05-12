/**
 * HealthCommandCenter — Operational command center providing system-level
 * health OS controls: domain activation/deactivation, monitoring frequency,
 * medication consent management, and system diagnostics.
 */
import React, { useState } from "react";
import { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import type { HealthDomain } from "../UnifiedHealthEngine";

const ALL_DOMAINS: { domain: HealthDomain; label: string; icon: string; requiresConsent?: boolean }[] = [
  { domain: "disease_intelligence", label: "Disease Intelligence", icon: "🔬" },
  { domain: "wearable", label: "Wearable Data", icon: "⌚" },
  { domain: "recovery", label: "Recovery Tracking", icon: "💚" },
  { domain: "sleep", label: "Sleep Analysis", icon: "🌙" },
  { domain: "activity", label: "Activity Monitoring", icon: "🏃" },
  { domain: "nutrition", label: "Nutrition", icon: "🥗" },
  { domain: "medication", label: "Medication Tracking", icon: "💊", requiresConsent: true },
  { domain: "wellness", label: "Wellness", icon: "✨" },
  { domain: "coaching", label: "Health Coaching", icon: "🧭" },
  { domain: "preventive", label: "Preventive Health", icon: "🛡️" },
  { domain: "emotional", label: "Emotional Wellbeing", icon: "🧠" },
];

export default function HealthCommandCenter() {
  const ctx = useUnifiedHealthContext();
  const [showMedConsent, setShowMedConsent] = useState(false);

  const isDomainActive = (domain: HealthDomain) =>
    ctx.config.activeDomains.includes(domain);

  const toggleDomain = (domain: HealthDomain, requiresConsent?: boolean) => {
    if (requiresConsent && !ctx.config.medicationConsent.consentGiven) {
      setShowMedConsent(true);
      return;
    }
    const current = ctx.config.activeDomains;
    const updated = isDomainActive(domain)
      ? current.filter(d => d !== domain)
      : [...current, domain];
    ctx.updateConfig({ activeDomains: updated });
  };

  return (
    <div style={{
      padding: "20px", borderRadius: "16px",
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <h3 style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.9)", fontSize: "15px" }}>
        ⚙️ Health Command Center
      </h3>

      {/* Domain Toggles */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
          Active Health Domains
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {ALL_DOMAINS.map(({ domain, label, icon, requiresConsent }) => (
            <div key={domain} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px", borderRadius: "10px",
              background: isDomainActive(domain) ? "rgba(255,255,255,0.04)" : "transparent",
              border: `1px solid ${isDomainActive(domain) ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"}`,
              cursor: "pointer", transition: "all 0.2s ease",
            }} onClick={() => toggleDomain(domain, requiresConsent)}>
              <span style={{ fontSize: "16px" }}>{icon}</span>
              <span style={{ flex: 1, color: "rgba(255,255,255,0.75)", fontSize: "13px" }}>{label}</span>
              {requiresConsent && !ctx.config.medicationConsent.consentGiven && (
                <span style={{ fontSize: "10px", color: "#fdcb6e", padding: "2px 6px", borderRadius: "6px", background: "rgba(253,203,110,0.1)" }}>
                  Consent Required
                </span>
              )}
              <div style={{
                width: "36px", height: "20px", borderRadius: "10px",
                background: isDomainActive(domain) ? "#00b894" : "rgba(255,255,255,0.1)",
                position: "relative", transition: "background 0.2s ease",
              }}>
                <div style={{
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: "#fff", position: "absolute", top: "2px",
                  left: isDomainActive(domain) ? "18px" : "2px",
                  transition: "left 0.2s ease",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monitoring Frequency */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
          Monitoring Frequency
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["realtime", "hourly", "daily"] as const).map(freq => (
            <button key={freq} onClick={() => ctx.updateConfig({ monitoringFrequency: freq })} style={{
              padding: "8px 16px", borderRadius: "10px", border: "none",
              background: ctx.config.monitoringFrequency === freq ? "rgba(0,184,148,0.15)" : "rgba(255,255,255,0.04)",
              color: ctx.config.monitoringFrequency === freq ? "#00b894" : "rgba(255,255,255,0.5)",
              fontSize: "12px", cursor: "pointer", textTransform: "capitalize",
              transition: "all 0.2s ease",
            }}>
              {freq}
            </button>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div style={{
        padding: "12px 16px", borderRadius: "10px",
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
        display: "flex", justifyContent: "space-between", fontSize: "12px",
      }}>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Active domains: {ctx.config.activeDomains.length}</span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Signals: {ctx.domainSignals.length}</span>
        <span style={{ color: ctx.unifiedState ? "#00b894" : "#fdcb6e" }}>
          {ctx.unifiedState ? "● System Active" : "○ Initializing"}
        </span>
      </div>

      {/* Medication Consent Modal */}
      {showMedConsent && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowMedConsent(false)}>
          <div style={{
            padding: "28px", borderRadius: "20px", maxWidth: "420px", width: "90%",
            background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "28px", textAlign: "center", marginBottom: "16px" }}>💊</div>
            <h3 style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.9)", fontSize: "16px", textAlign: "center" }}>
              Medication Tracking Consent
            </h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.6, textAlign: "center" }}>
              Medication tracking helps us correlate your treatment with recovery progress.
              Your data stays on your device and is never shared without your explicit permission.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "20px" }}>
              <button onClick={() => { ctx.grantMedicationConsent(); setShowMedConsent(false); }} style={{
                padding: "12px", borderRadius: "12px", border: "none",
                background: "linear-gradient(135deg, #00b894, #00a388)", color: "#fff",
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
              }}>
                Enable Medication Tracking
              </button>
              <button onClick={() => setShowMedConsent(false)} style={{
                padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "rgba(255,255,255,0.5)",
                fontSize: "13px", cursor: "pointer",
              }}>
                Not Right Now
              </button>
            </div>
            <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "11px", textAlign: "center" }}>
              You can revoke consent at any time from settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
