/**
 * OperationalCalmnessGuard — Ensures UX remains calm even during system
 * failures. Replaces error states with reassuring, medically-safe fallback
 * messages. Prevents panic-heavy UI states.
 */
import { useCallback } from "react";

export interface CalmnessResult {
  isCalmState: boolean;
  userMessage: string;
  technicalDetail: string;
  suggestedAction: string;
  showRetry: boolean;
  severity: "info" | "minor" | "major";
}

export function useOperationalCalmness() {
  const handleFailure = useCallback((error: {
    type: "network" | "timeout" | "server" | "parsing" | "wearable" | "storage" | "unknown";
    originalMessage?: string;
    context?: string;
  }): CalmnessResult => {
    switch (error.type) {
      case "network":
        return {
          isCalmState: true,
          userMessage: "We're having trouble connecting right now. Your data is safe.",
          technicalDetail: error.originalMessage || "Network connectivity issue",
          suggestedAction: "We'll automatically retry when your connection is restored.",
          showRetry: true,
          severity: "minor",
        };

      case "timeout":
        return {
          isCalmState: true,
          userMessage: "The analysis is taking longer than expected. This sometimes happens with complex health patterns.",
          technicalDetail: error.originalMessage || "Request timeout",
          suggestedAction: "Please wait a moment — we're still working on your analysis.",
          showRetry: true,
          severity: "minor",
        };

      case "server":
        return {
          isCalmState: true,
          userMessage: "Our health intelligence system is briefly unavailable. Your investigation history is preserved.",
          technicalDetail: error.originalMessage || "Server error",
          suggestedAction: "Please try again in a moment. All your data remains safe.",
          showRetry: true,
          severity: "major",
        };

      case "wearable":
        return {
          isCalmState: true,
          userMessage: "Wearable data isn't available right now. We'll continue with your reported symptoms.",
          technicalDetail: error.originalMessage || "Wearable connection lost",
          suggestedAction: "Your analysis continues — wearable data will be incorporated when reconnected.",
          showRetry: false,
          severity: "info",
        };

      case "storage":
        return {
          isCalmState: true,
          userMessage: "Some local data couldn't be saved. Your current session is unaffected.",
          technicalDetail: error.originalMessage || "localStorage quota exceeded",
          suggestedAction: "The current analysis will proceed normally.",
          showRetry: false,
          severity: "info",
        };

      case "parsing":
        return {
          isCalmState: true,
          userMessage: "We received an unexpected response. Let's try that again.",
          technicalDetail: error.originalMessage || "Response parsing error",
          suggestedAction: "Please retry — this is typically a temporary issue.",
          showRetry: true,
          severity: "minor",
        };

      default:
        return {
          isCalmState: true,
          userMessage: "Something unexpected happened, but your health data is safe.",
          technicalDetail: error.originalMessage || "Unknown error",
          suggestedAction: "Please try again. If this persists, your investigation history is preserved.",
          showRetry: true,
          severity: "minor",
        };
    }
  }, []);

  return { handleFailure };
}
