/**
 * InvestigationRecoveryManager — Saves investigation checkpoints to
 * localStorage during analysis. On app reload: detects incomplete
 * investigations and offers graceful recovery.
 */
import { useCallback } from "react";
import { RECOVERY_THRESHOLDS } from "../guards/ClinicalSafetyThresholds";

export interface RecoveryCheckpoint {
  investigationId: string;
  sessionId: string;
  timestamp: number;
  phase: string;
  symptoms: string[];
  conversation: { type: string; text: string }[];
  partialResults?: {
    primaryCondition?: string;
    confidence?: number;
    escalation?: string;
  };
  governanceState?: {
    auditRecorded: boolean;
    safetyPassed: boolean;
  };
}

export interface RecoveryOffer {
  hasRecoverable: boolean;
  checkpoint: RecoveryCheckpoint | null;
  ageMinutes: number;
  isValid: boolean;
  message: string;
}

const CHECKPOINT_KEY = "medicare_investigation_checkpoint";

export function useInvestigationRecovery() {
  const saveCheckpoint = useCallback((checkpoint: RecoveryCheckpoint) => {
    try {
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
    } catch { /* storage full */ }
  }, []);

  const checkForRecovery = useCallback((): RecoveryOffer => {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      if (!raw) return { hasRecoverable: false, checkpoint: null, ageMinutes: 0, isValid: false, message: "" };

      const checkpoint: RecoveryCheckpoint = JSON.parse(raw);
      const ageMs = Date.now() - checkpoint.timestamp;
      const ageMinutes = Math.round(ageMs / 60_000);
      const isValid = ageMs < RECOVERY_THRESHOLDS.CHECKPOINT_VALIDITY_MS && checkpoint.conversation.length >= RECOVERY_THRESHOLDS.MIN_RECOVERY_DATA;

      let message: string;
      if (!isValid) {
        message = ageMs >= RECOVERY_THRESHOLDS.CHECKPOINT_VALIDITY_MS
          ? "A previous investigation was found but is too old to recover safely."
          : "A previous investigation was found but has insufficient data for recovery.";
      } else {
        message = `Welcome back — your investigation from ${ageMinutes} minute${ageMinutes !== 1 ? "s" : ""} ago is safe. Would you like to continue where you left off?`;
      }

      return { hasRecoverable: true, checkpoint: isValid ? checkpoint : null, ageMinutes, isValid, message };
    } catch {
      return { hasRecoverable: false, checkpoint: null, ageMinutes: 0, isValid: false, message: "" };
    }
  }, []);

  const clearCheckpoint = useCallback(() => {
    try { localStorage.removeItem(CHECKPOINT_KEY); } catch { /* */ }
  }, []);

  const updateCheckpoint = useCallback((update: Partial<RecoveryCheckpoint>) => {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      if (raw) {
        const existing: RecoveryCheckpoint = JSON.parse(raw);
        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ ...existing, ...update, timestamp: Date.now() }));
      }
    } catch { /* */ }
  }, []);

  return { saveCheckpoint, checkForRecovery, clearCheckpoint, updateCheckpoint };
}
