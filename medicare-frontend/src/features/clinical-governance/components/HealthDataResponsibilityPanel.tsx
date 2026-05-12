/**
 * HealthDataResponsibilityPanel — Privacy and data responsibility disclosure.
 * Shows what data is stored locally, what is sent to the server, how wearable
 * data is used. Includes monitoring consent controls.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

interface Props {
  consent: {
    localStorageConsent: boolean;
    wearableDataConsent: boolean;
    monitoringConsent: boolean;
    auditTrailConsent: boolean;
  };
  onConsentChange: (key: string, value: boolean) => void;
}

export default function HealthDataResponsibilityPanel({ consent, onConsentChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const dataItems = [
    {
      label: "Local Health History",
      description: "Investigation results and audit trails stored on this device only.",
      storage: "Device only",
      icon: "fa-hard-drive",
      consentKey: "localStorageConsent",
      enabled: consent.localStorageConsent,
      required: true,
    },
    {
      label: "Wearable Health Data",
      description: "Heart rate, HRV, and activity data from your connected wearable.",
      storage: "Processed locally, sent for analysis",
      icon: "fa-watch",
      consentKey: "wearableDataConsent",
      enabled: consent.wearableDataConsent,
      required: false,
    },
    {
      label: "Continuous Monitoring",
      description: "Background health trend tracking between investigations.",
      storage: "Device only",
      icon: "fa-wave-square",
      consentKey: "monitoringConsent",
      enabled: consent.monitoringConsent,
      required: false,
    },
    {
      label: "Governance Audit Trail",
      description: "Records of safety checks and reasoning decisions for transparency.",
      storage: "Device only",
      icon: "fa-clipboard-check",
      consentKey: "auditTrailConsent",
      enabled: consent.auditTrailConsent,
      required: true,
    },
  ];

  return (
    <div style={{
      background: "rgba(8, 12, 12, 0.5)",
      border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: 12, overflow: "hidden", marginTop: 8,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", cursor: "pointer", background: "rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-lock" style={{ fontSize: "0.55rem", color: theme.colors.accent.primary }} />
          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            Data & Privacy
          </span>
        </div>
        <i className="fas fa-chevron-down" style={{
          fontSize: "0.42rem", color: "rgba(255,255,255,0.3)",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
        }} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "8px 12px" }}>
              {dataItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 10px", borderRadius: 8,
                    background: "rgba(0,0,0,0.1)", marginBottom: 6,
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{
                    fontSize: "0.5rem", marginTop: 2,
                    color: item.enabled ? theme.colors.accent.primary : "rgba(255,255,255,0.2)",
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "0.43rem", color: "rgba(255,255,255,0.35)", marginTop: 2, lineHeight: 1.4 }}>
                      {item.description}
                    </div>
                    <div style={{ fontSize: "0.4rem", color: "rgba(255,255,255,0.25)", marginTop: 3 }}>
                      <i className="fas fa-database" style={{ marginRight: 4, fontSize: "0.35rem" }} />
                      {item.storage}
                    </div>
                  </div>
                  {/* Toggle */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!item.required) onConsentChange(item.consentKey, !item.enabled);
                    }}
                    style={{
                      width: 32, height: 16, borderRadius: 8, marginTop: 2,
                      background: item.enabled ? `${theme.colors.accent.primary}40` : "rgba(255,255,255,0.08)",
                      position: "relative", cursor: item.required ? "default" : "pointer",
                      transition: "background 0.2s",
                      opacity: item.required ? 0.5 : 1,
                    }}
                    title={item.required ? "Required for core functionality" : "Toggle consent"}
                  >
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%",
                      background: item.enabled ? theme.colors.accent.primary : "rgba(255,255,255,0.2)",
                      position: "absolute", top: 2,
                      left: item.enabled ? 18 : 2,
                      transition: "left 0.2s, background 0.2s",
                    }} />
                  </div>
                </motion.div>
              ))}

              <div style={{
                marginTop: 4, padding: "6px 10px", borderRadius: 6,
                background: "rgba(0,0,0,0.1)",
                fontSize: "0.42rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5,
              }}>
                <i className="fas fa-shield-halved" style={{ marginRight: 4 }} />
                Your health data never leaves your device without your knowledge. All analysis is governed by clinical safety protocols.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
