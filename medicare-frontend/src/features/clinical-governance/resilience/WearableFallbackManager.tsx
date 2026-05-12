/**
 * WearableFallbackManager — Handles wearable disconnection gracefully.
 * Falls back to symptom-only reasoning with transparency disclosure.
 */
import { useCallback } from "react";

export interface WearableFallbackState {
  isConnected: boolean;
  fallbackActive: boolean;
  fallbackReason: string;
  disclosureMessage: string;
  confidenceAdjustment: number;  // Reduction in confidence weight
  lastConnectedTimestamp: number | null;
}

export function useWearableFallback() {
  const evaluate = useCallback((wearableStatus: {
    connected: boolean;
    reliability: number;
    lastDataTimestamp: number | null;
  }): WearableFallbackState => {
    const { connected, reliability, lastDataTimestamp } = wearableStatus;

    if (connected && reliability > 60) {
      return {
        isConnected: true, fallbackActive: false, fallbackReason: "",
        disclosureMessage: "", confidenceAdjustment: 0,
        lastConnectedTimestamp: Date.now(),
      };
    }

    if (!connected) {
      const hoursSince = lastDataTimestamp ? (Date.now() - lastDataTimestamp) / 3_600_000 : Infinity;
      return {
        isConnected: false, fallbackActive: true,
        fallbackReason: "Wearable device disconnected",
        disclosureMessage: hoursSince < 2
          ? "Wearable data from your last session is being used alongside your reported symptoms."
          : "Analysis is based on your reported symptoms. Connect your wearable for enhanced insights.",
        confidenceAdjustment: -0.1,
        lastConnectedTimestamp: lastDataTimestamp,
      };
    }

    // Connected but low reliability
    return {
      isConnected: true, fallbackActive: true,
      fallbackReason: `Wearable signal quality is low (${reliability}%)`,
      disclosureMessage: "Wearable data quality is reduced — your reported symptoms are weighted more heavily.",
      confidenceAdjustment: -0.05,
      lastConnectedTimestamp: Date.now(),
    };
  }, []);

  return { evaluate };
}
