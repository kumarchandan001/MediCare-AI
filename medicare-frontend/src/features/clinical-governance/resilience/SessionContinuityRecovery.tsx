/**
 * SessionContinuityRecovery — Detects session interruptions and restores
 * governance state, audit trail, and monitoring on reconnect. Shows calm
 * recovery UX: "Welcome back — your investigation is safe."
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useInvestigationRecovery, RecoveryOffer } from "./InvestigationRecoveryManager";

interface Props {
  onRecover: (checkpoint: any) => void;
  onDismiss: () => void;
}

export default function SessionContinuityRecovery({ onRecover, onDismiss }: Props) {
  const recovery = useInvestigationRecovery();
  const [offer, setOffer] = useState<RecoveryOffer | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const result = recovery.checkForRecovery();
    if (result.hasRecoverable && result.isValid) {
      setOffer(result);
      setVisible(true);
    }
  }, [recovery]);

  const handleRecover = () => {
    if (offer?.checkpoint) {
      onRecover(offer.checkpoint);
      recovery.clearCheckpoint();
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    recovery.clearCheckpoint();
    setVisible(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visible && offer && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, maxWidth: 420, width: "90%",
          }}
        >
          <div style={{
            background: "linear-gradient(135deg, rgba(15,20,20,0.97), rgba(10,15,15,0.98))",
            border: "1px solid rgba(0,245,200,0.15)",
            borderRadius: 14, padding: "16px 20px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
            {/* Icon & Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `${theme.colors.accent.primary}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="fas fa-shield-heart" style={{ color: theme.colors.accent.primary, fontSize: "0.8rem" }} />
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
                  Welcome Back
                </div>
                <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.5)" }}>
                  Your investigation is safe
                </div>
              </div>
            </div>

            {/* Message */}
            <div style={{
              fontSize: "0.55rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6,
              marginBottom: 14, padding: "8px 10px",
              background: "rgba(0,0,0,0.2)", borderRadius: 8,
            }}>
              {offer.message}
              {offer.checkpoint && (
                <div style={{ marginTop: 6, fontSize: "0.48rem", color: "rgba(255,255,255,0.4)" }}>
                  <i className="fas fa-clock" style={{ marginRight: 4 }} />
                  {offer.checkpoint.conversation.length} conversation entries saved
                  {offer.checkpoint.symptoms.length > 0 && ` • ${offer.checkpoint.symptoms.length} symptoms recorded`}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleRecover}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                  background: theme.colors.accent.primary, color: "#0a0f0f",
                  fontSize: "0.55rem", fontWeight: 700, cursor: "pointer",
                }}
              >
                <i className="fas fa-arrow-rotate-left" style={{ marginRight: 6 }} />
                Continue Investigation
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  padding: "8px 14px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent", color: "rgba(255,255,255,0.5)",
                  fontSize: "0.55rem", fontWeight: 600, cursor: "pointer",
                }}
              >
                Start Fresh
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
