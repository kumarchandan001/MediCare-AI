/**
 * PassiveHealthSignalCoordinator — Coordinates passive health signals
 * from ambient sensors without invasive monitoring behavior.
 */
import { useCallback } from "react";

export interface PassiveSignal {
  source: string;
  signalType: "movement" | "sleep" | "heart_rate" | "ambient" | "behavioral";
  value: number;
  unit: string;
  invasiveness: "none" | "minimal" | "moderate";
  userConsented: boolean;
  timestamp: number;
}

export function usePassiveHealthSignalCoordinator() {
  const filterEthical = useCallback((signals: PassiveSignal[]): PassiveSignal[] => {
    return signals.filter(s => s.userConsented && s.invasiveness !== "moderate");
  }, []);

  const assessSignalQuality = useCallback((signals: PassiveSignal[]): { quality: number; coverage: string[]; gaps: string[] } => {
    const types = new Set(signals.map(s => s.signalType));
    const expected: PassiveSignal["signalType"][] = ["movement", "sleep", "heart_rate"];
    const gaps = expected.filter(e => !types.has(e));
    return { quality: Math.min(100, (types.size / expected.length) * 100), coverage: Array.from(types), gaps };
  }, []);

  return { filterEthical, assessSignalQuality };
}
